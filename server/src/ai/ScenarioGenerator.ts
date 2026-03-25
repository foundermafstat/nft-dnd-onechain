import { generateContent } from './openai';
import { PartyContext, GeneratedScenario } from 'shared';
import { getRecentChronicles, saveGeneratedScenario, markScenarioApplied } from '../db/scenarioQueries';
import { getCharactersByPlayerId } from '../db/characterQueries';
import { seedLocations } from '../db/questQueries';
import { seedNpcs } from '../db/npcQueries';
import { v4 as uuidv4 } from 'uuid';

export class ScenarioGenerator {

    /**
     * Aggregates context about the player party and recent events
     * to feed into the LLM.
     */
    public async buildPartyContext(playerIds: string[], sessionId?: string): Promise<PartyContext> {
        const characters = [];
        let totalLevel = 0;

        for (const pid of playerIds) {
            const chars = await getCharactersByPlayerId(pid);
            if (chars && chars.length > 0) {
                const c = chars[0]; // Assuming first char for now
                totalLevel += c.level || 1;

                // Real DB structure has flat stats_str, etc.
                characters.push({
                    id: c.id,
                    name: c.name,
                    class: c.class_name,
                    stats: {
                        str: c.stats_str,
                        dex: c.stats_dex,
                        con: c.stats_con,
                        int: c.stats_int,
                        wis: c.stats_wis,
                        cha: c.stats_cha
                    },
                    hp: { current: c.hp, max: c.max_hp },
                    keyItems: [] // Ideally from inventory
                });
            }
        }

        const partyLevel = playerIds.length > 0 ? Math.round(totalLevel / playerIds.length) : 1;

        // Fetch recent narrative context
        const chronicles = await getRecentChronicles(3, sessionId);
        const recentEvents = chronicles.map(c => c.narrative);

        return {
            partyLevel,
            characters,
            currentBiome: 'Unknown Depths', // Could be fetched from current location metadata
            recentEvents
        };
    }

    /**
     * Calls GPT-4o to generate a new scenario based on party context.
     * Uses strict JSON enforcement.
     */
    public async generateScenario(context: PartyContext): Promise<GeneratedScenario | null> {
        const systemPrompt = `Вы — безжалостный, но справедливый ИИ-Мастер игры в жанре Dark Fantasy (на базе правил Shadowdark RPG). Ваша задача — сгенерировать следующую сцену/комнату для группы игроков.

ПРАВИЛА АДАПТАЦИИ:
Внимательно изучите массив characters. Если в группе есть Thief (Вор) с высокой Ловкостью (DEX), обязательно добавьте ловушку или закрытый сундук (требует DEX Check). Если есть Wizard с высоким Интеллектом (INT), добавьте магическую руну или загадку.
Если у игроков мало HP (меньше 30%), предложите социальный энкаунтер, торговца или NPC вместо смертельной битвы.
Баланс боевки: Суммарный HP мобов не должен превышать суммарный текущий HP партии более чем на 50%.

ФОРМАТ ОТВЕТА:
Вы ОБЯЗАНЫ вернуть валидный JSON без маркдаун-блоков. Схема JSON:
{
  "narrativeDescription": "Художественное описание локации...",
  "location": { "name": "...", "gridSize": {"width": 10, "height": 10}, "environmentHazards": [] },
  "npcs": [{ "name": "...", "description": "...", "dialogStarter": "...", "motivation": "...", "isHostile": false }],
  "puzzleOrTrap": { "exists": true, "description": "...", "requiredStat": "INT", "difficultyClass": 12, "successOutcome": "...", "failOutcome": "..." },
  "combatEncounter": { 
      "exists": true, 
      "triggerDescription": "...", 
      "enemies": [{ "type": "Goblin", "hp": 15, "ac": 11, "attacks": [{"name": "Slash", "damage": "1d6", "type": "physical"}], "behavior": "..." }] 
  }
}`;

        const userPrompt = `Context:\n${JSON.stringify(context, null, 2)}`;

        try {
            const scenario = await generateContent<GeneratedScenario>(systemPrompt, userPrompt);
            return scenario;
        } catch (error) {
            console.error('Failed to generate scenario via LLM:', error);
            return null;
        }
    }

    /**
     * Applies the generated scenario to the game database:
     * - Spawns a Location
     * - Spawns NPCs
     * - Saves scenario for audit
     */
    public async applyScenario(context: PartyContext, scenario: GeneratedScenario): Promise<string | null> {
        const locationId = uuidv4();

        try {
            // 1. Save Location
            await seedLocations([{
                id: locationId,
                name: scenario.location.name,
                biome_type: context.currentBiome,
                room_type: 'Generated',
                threat_level: scenario.combatEncounter.exists ? context.partyLevel + 1 : 1,
                coordinates: { width: scenario.location.gridSize.width, height: scenario.location.gridSize.height }
            }]);

            // 2. Save NPCs
            if (scenario.npcs && scenario.npcs.length > 0) {
                const npcSeeds = scenario.npcs.map(n => ({
                    id: uuidv4(),
                    location_id: locationId,
                    name: n.name,
                    title: n.isHostile ? 'Enemy' : 'Wanderer',
                    tile_x: Math.floor(Math.random() * scenario.location.gridSize.width),
                    tile_y: Math.floor(Math.random() * scenario.location.gridSize.height),
                    metadata: {
                        greeting: n.dialogStarter,
                        appearance: n.description,
                        motivation: n.motivation
                    }
                }));
                await seedNpcs(npcSeeds);

                // TODO: Store dialogueStarters in an AI memory DB for the NpcDialog chat system.
            }

            // 3. Save Scenario Payload to DB
            const dbId = await saveGeneratedScenario(locationId, context, scenario);
            if (dbId) {
                await markScenarioApplied(dbId);
            }

            return locationId;

        } catch (error) {
            console.error('Error applying scenario to database:', error);
            return null;
        }
    }
}
