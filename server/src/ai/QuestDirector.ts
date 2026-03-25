import { generateContent } from './openai';
import { insertQuestHistory, getLastSuccessfulProgression } from '../db/questQueries';

export interface QuestActionInput {
    questId: string;
    locationId?: string;
    playerAction: string;
    playerBackground?: string;
    playerRoll: number;
    currentZoneThreatLevel: number;
    enemyCount?: number;
    initialEnemyCount?: number;
}

export interface QuestActionOutput {
    narrative: string;
    engine_trigger: string;
    on_chain_event: boolean;
}

/**
 * QuestDirector manages the Chronological narrative and applies Shadowdark/GDD rules.
 */
export class QuestDirector {

    // GDD 1.2 Dead-end Protection: If no progress 10 mins, spawn patrol.
    private checkDeadEnd(lastProgressTime: Date | null): boolean {
        if (!lastProgressTime) return false;
        const now = new Date();
        const diffMins = (now.getTime() - lastProgressTime.getTime()) / 60000;
        return diffMins >= 10;
    }

    public async processAction(input: QuestActionInput): Promise<QuestActionOutput | null> {
        // 1. Check Dead-end protection
        const lastProgress = await getLastSuccessfulProgression(input.questId);
        if (this.checkDeadEnd(lastProgress)) {
            const event: QuestActionOutput = {
                narrative: "You hear the clanking of armor echoing through the corridor. A patrol has found you.",
                engine_trigger: "spawn_patrol",
                on_chain_event: false
            };
            await this.logHistory(input, event, 0); // DM roll 0
            return event;
        }

        // 2. Moral Checks if > 50% enemy loss
        if (input.enemyCount !== undefined && input.initialEnemyCount !== undefined) {
            if (input.enemyCount <= input.initialEnemyCount / 2) {
                // Simulate DM roll for Morale (DC 15 WIS check for enemies)
                const dmRoll = Math.floor(Math.random() * 20) + 1;
                if (dmRoll < 15) {
                    const event: QuestActionOutput = {
                        narrative: "The enemies look around, realizing they are outnumbered. They drop their weapons and attempt to flee in terror!",
                        engine_trigger: "enemies_flee",
                        on_chain_event: false
                    };
                    await this.logHistory(input, event, dmRoll);
                    return event;
                }
            }
        }

        // 3. Prepare AI Prompt based on Rules
        let rulesInjection = "";
        if (input.playerRoll === 20) {
            rulesInjection = "The player rolled a Natural 20. Describe an absolute triumph and heroic success.";
        } else if (input.playerRoll === 1) {
            rulesInjection = "The player rolled a Natural 1. Describe a critical failure, applying a Wizard Mishap or their gear breaking.";
        } else if (input.playerRoll >= 15) {
            rulesInjection = "The player succeeded.";
        } else {
            rulesInjection = "The player failed their attempt.";
        }

        if (input.playerBackground) {
            rulesInjection += ` The player has a '${input.playerBackground}' background. Consider giving them an advantage or unique flavor in the outcome.`;
        }

        const systemPrompt = `You are the AI Dungeon Master for NFT-DND. You run a Grim, laconic, 'Old School' fantasy game using 'Speed, Danger, Simplicity'.
        Describe smells, sounds, and the feeling of a dying torch.
        Follow these strict outcomes: ${rulesInjection}
        Output ONLY JSON in the exact format:
        { "narrative": "...", "engine_trigger": "...", "on_chain_event": boolean }
        engine_trigger should be things like 'obstacle_cleared', 'combat_start', 'trap_triggered', 'none'.
        on_chain_event should be true ONLY if the players made a monumental decision (e.g. burn a city vs save it).`;

        const userPrompt = `Input Context: [{"Player_Action": "${input.playerAction}", "Roll_Result": ${input.playerRoll}, "Current_Zone_Threat_Level": ${input.currentZoneThreatLevel}}]`;

        const aiOutput = await generateContent<QuestActionOutput>(systemPrompt, userPrompt);

        if (aiOutput) {
            // Log History
            await this.logHistory(input, aiOutput, Math.floor(Math.random() * 20) + 1);
        }

        return aiOutput;
    }

    private async logHistory(input: QuestActionInput, aiOutput: QuestActionOutput, dmRoll: number) {
        await insertQuestHistory({
            quest_id: input.questId,
            location_id: input.locationId,
            player_action: input.playerAction,
            player_background: input.playerBackground,
            player_roll: input.playerRoll,
            dm_roll: dmRoll,
            ai_narrative: aiOutput.narrative,
            engine_trigger: aiOutput.engine_trigger,
            on_chain_event: aiOutput.on_chain_event
        });
    }
}
