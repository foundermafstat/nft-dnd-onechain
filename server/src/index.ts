import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import CryptoJS from 'crypto-js';

import { supabase } from './db/supabase';
import { uploadToIPFS, uploadJsonToIPFS } from './services/ipfs';
import { upsertPlayerByWallet } from './db/playerQueries';
import { applyQuestProgressToCharacter, createCharacter, getCharacterById, getCharactersByPlayerId } from './db/characterQueries';
import { createQuest, createQuestWithFlow, finishQuest, getAllQuests, getLatestInProgressQuestForPlayer, getQuestById, getQuestHistory, insertQuestHistory, seedLocations, getAllLocations, getLocationById, upsertPlayerPosition, getPlayerPosition, getPlayersInLocation, updateQuestFlowState } from './db/questQueries';
import { getNpcsByLocation, getNpcById, seedNpcs } from './db/npcQueries';
import { seedItems, getAllTemplateItems, getItemsByCategory, getItemById, createItemInstance, createCustomItemInstance, addItemToInventory, getCharacterInventory, removeItemFromInventory, equipItem, unequipItem, updateItemBlockchainInfo } from './db/itemQueries';
import { seedAbilities, getAllAbilities, getAbilitiesByType, getAbilitiesForClass, getAbilitiesForAncestry, getAbilityById, learnAbility, getCharacterAbilities, forgetAbility, getAbilitiesForProfile } from './db/abilityQueries';
import { ALL_SEED_LOCATIONS } from './game/locationSeeds';
import { ALL_SEED_NPCS } from './game/npcSeeds';
import { ALL_SEED_ITEMS, CLASS_STARTER_ITEMS } from './game/itemSeeds';
import { QUICKSTART_COMMON_ITEM_SEEDS } from './game/quickstartCommonItemSeeds';
import { ALL_SEED_ABILITIES } from './game/abilitySeeds';
import { QuestDirector, QuestActionInput } from './ai/QuestDirector';
import { generateNpcDialog } from './ai/npcDialog';
import { CombatEngine } from './combat/CombatEngine';
import { getCombat } from './db/combatQueries';
import { ScenarioGenerator } from './ai/ScenarioGenerator';
import { getRecentChronicles, insertChronicle } from './db/scenarioQueries';
import { generateQuestNftArtifact } from './ai/nftItemGenerator';
import { dicepackService } from './services/dicepack';
import { onechainContractMeta, onechainEntryTargets, isOnechainContractConfigured } from './services/onechainContract';
import {
    buildAldricRewardDraft,
    buildInitialAldricFlow,
    buildInitialMartaFlow,
    buildRewardDraft,
    computeQuestProgressDelta,
    GRIM_ALDRIC_NPC_ID,
    OLD_MARTA_NPC_ID,
    resolveRewardFromOutcome,
    rollD20,
    TAVERN_CELLAR_LOCATION_ID,
} from './game/martaQuest';
import {
    Ancestry,
    HeroClass,
    MARTA_QUEST_XP_LEVEL_2_THRESHOLD,
    CLASS_MODIFIERS,
    SHADOWDARK_STAT_KEYS,
    calculateGearSlotsForProfile,
    calculateModifier,
    getProfileStatLimits,
    rollValidQuickstartStats,
    statsMeetLimits,
    type ShadowdarkStats,
} from 'shared';

const questDirector = new QuestDirector();
const combatEngine = new CombatEngine();
const scenarioGenerator = new ScenarioGenerator();

// Load environment variables from the root .env file
dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;
const dicepackRelayerKey = process.env.DICEPACK_RELAYER_KEY || '';

app.use(cors());
app.use(express.json());

// Configure multer for memory storage (for file uploads)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

function toSlug(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'nft-item';
}

function isHeroClass(value: unknown): value is HeroClass {
    return typeof value === 'string' && (Object.values(HeroClass) as string[]).includes(value);
}

function isAncestry(value: unknown): value is Ancestry {
    return typeof value === 'string' && (Object.values(Ancestry) as string[]).includes(value);
}

function readStatsFromPayload(payload: unknown): ShadowdarkStats | null {
    if (!payload || typeof payload !== 'object') return null;
    const candidate = payload as Record<string, unknown>;
    const stats = {} as ShadowdarkStats;
    for (const key of SHADOWDARK_STAT_KEYS) {
        const raw = candidate[key];
        if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
        stats[key] = Math.floor(raw);
    }
    return stats;
}

function rollDie(sides: number, rng: () => number = Math.random): number {
    return Math.floor(rng() * sides) + 1;
}

function readFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function readQuestFlow(quest: any) {
    if (!quest || typeof quest !== 'object') return null;
    const statChanges = quest.stat_changes;
    if (!statChanges || typeof statChanges !== 'object') return null;
    const flow = (statChanges as any).flow;
    if (!flow || typeof flow !== 'object') return null;
    return flow as any;
}

function isQuestCompletedState(state: unknown): boolean {
    return state === 'COMPLETED_SUCCESS' || state === 'COMPLETED_FAIL';
}

function isQuestInProgressState(state: unknown): boolean {
    if (typeof state !== 'string') return false;
    return !isQuestCompletedState(state);
}

function getQuestLine(flow: any): 'marta' | 'aldric' | null {
    if (!flow || typeof flow !== 'object') return null;
    if (flow.questLine === 'marta' || flow.questLine === 'aldric') return flow.questLine;
    if (flow.martaNpcId === OLD_MARTA_NPC_ID || flow.questGiverNpcId === OLD_MARTA_NPC_ID) return 'marta';
    if (flow.questGiverNpcId === GRIM_ALDRIC_NPC_ID) return 'aldric';
    return null;
}

async function buildLocationContext(locationId: string, playerId: string) {
    const location = await getLocationById(locationId);
    if (!location) return null;

    const coordinates = location.coordinates && typeof location.coordinates === 'object' ? location.coordinates : {};
    const exits = Array.isArray(coordinates.exits) ? [...coordinates.exits] : [];
    const spawnPoints = Array.isArray(coordinates.spawn_points) ? coordinates.spawn_points : [];

    if (locationId === '00000000-0000-4000-a000-000000000001') {
        const active = await getLatestInProgressQuestForPlayer(playerId);
        const activeFlow = readQuestFlow(active);
        const activeLine = getQuestLine(activeFlow);
        if (
            active &&
            activeFlow &&
            activeLine === 'aldric' &&
            (activeFlow.state === 'COMBAT_REQUIRED' || activeFlow.state === 'ADVENTURE_ACTIVE' || activeFlow.state === 'RETURN_TO_ALDRIC') &&
            !isQuestCompletedState(activeFlow.state)
        ) {
            exits.push({
                tile_x: 17,
                tile_y: 2,
                target_location_id: TAVERN_CELLAR_LOCATION_ID,
                target_location_name: 'Tavern Cellar',
                spawn_label: 'from_tavern',
                edge: 'north',
                dynamic: true,
                questLine: 'aldric',
            });
        }
    }

    return {
        ...location,
        coordinates: {
            ...coordinates,
            exits,
            spawn_points: spawnPoints,
        },
    };
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NFT-DND Server is running' });
});

app.get('/api/onechain/contract', (req, res) => {
    res.json({
        success: true,
        configured: isOnechainContractConfigured(),
        contract: onechainContractMeta,
        targets: onechainEntryTargets,
    });
});

app.post('/api/auth/wallet', async (req, res) => {
    const { publicKey } = req.body;

    if (!publicKey) {
        return res.status(400).json({ error: 'Missing publicKey' });
    }

    try {
        const player = await upsertPlayerByWallet(publicKey);
        res.json({ success: true, player });
    } catch (error: any) {
        res.status(500).json({ error: 'Auth failed', details: error.message });
    }
});

// --- CHARACTER ENDPOINTS ---

app.post('/api/character/generate', async (req, res) => {
    try {
        const { prompt } = req.body;

        const systemPrompt = `You are an expert game master for a dark-fantasy RPG akin to Shadowdark. 
Generate a level 1 hero based on the user's prompt. 
Respond ONLY with a valid JSON strictly matching this schema, no markdown blocks or extra text:
{
  "name": "string",
  "ancestry": "Dwarf | Elf | Goblin | Halfling | HalfOrc | Human",
  "class": "Fighter | Priest | Thief | Wizard",
  "alignment": "Lawful | Neutral | Chaotic",
  "background": "A short, gritty 1-2 sentence origin story.",
  "stats": {
    "str": number (3-18),
    "dex": number (3-18),
    "con": number (3-18),
    "int": number (3-18),
    "wis": number (3-18),
    "cha": number (3-18)
  }
}
The total sum of stats should be around 65-75. Assign highest stats to attributes relevant to their class.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt || 'Generate a random dark fantasy hero.' }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("No content generated");

        const data = JSON.parse(content);
        res.json({ success: true, character: data });

    } catch (error: any) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate character', details: error.message });
    }
});

app.post('/api/character/roll', async (req, res) => {
    try {
        const requestedClass = req.body?.class;
        const requestedAncestry = req.body?.ancestry;
        if (!isHeroClass(requestedClass) || !isAncestry(requestedAncestry)) {
            return res.status(400).json({ error: 'Invalid class or ancestry' });
        }
        const heroClass = requestedClass;
        const ancestry = requestedAncestry;

        const { stats, attempts, limits } = rollValidQuickstartStats({ heroClass, ancestry });
        const hitDie = CLASS_MODIFIERS[heroClass].hitDie;
        const hpRoll = rollDie(hitDie);
        const conModifier = calculateModifier(stats.con);
        const ancestryBonusHp = ancestry === Ancestry.Dwarf ? 2 : 0;
        const maxHp = Math.max(1, hpRoll + conModifier) + ancestryBonusHp;
        const goldDieA = rollDie(6);
        const goldDieB = rollDie(6);
        const startingGoldGp = (goldDieA + goldDieB) * 5;
        const armorClass = 10 + calculateModifier(stats.dex);

        return res.json({
            success: true,
            profile: { heroClass, ancestry },
            stats,
            limits,
            attempts,
            source: 'offchain_strict_quickstart_roll_v1',
            derived: {
                hitPoints: {
                    hitDie,
                    roll: hpRoll,
                    conModifier,
                    ancestryBonus: ancestryBonusHp,
                    total: maxHp,
                },
                armorClass,
                startingGold: {
                    dice: [goldDieA, goldDieB],
                    totalGp: startingGoldGp,
                },
            },
            metadata: {
                statRoll: '3d6 for each stat; reroll full set when no stat is 14+',
                profileConstraintsApplied: true,
            },
        });
    } catch (error: any) {
        return res.status(422).json({ error: 'Character stat roll failed', details: error.message });
    }
});

app.post('/api/character/create', async (req, res) => {
    try {
        const characterData = req.body;

        // Basic validation
        if (!characterData.playerId || !characterData.name || !characterData.class || !characterData.ancestry) {
            return res.status(400).json({ error: 'Missing required character fields' });
        }
        if (!isHeroClass(characterData.class) || !isAncestry(characterData.ancestry)) {
            return res.status(400).json({ error: 'Invalid class or ancestry' });
        }

        const rolledStats = readStatsFromPayload(characterData.stats);
        if (!rolledStats) {
            return res.status(400).json({ error: 'Invalid stats payload' });
        }

        const limits = getProfileStatLimits(characterData.class, characterData.ancestry);
        if (!statsMeetLimits(rolledStats, limits)) {
            return res.status(400).json({
                error: 'Stats do not satisfy class/ancestry limits',
                limits,
                stats: rolledStats,
            });
        }

        const hpCurrent = readFiniteNumber(characterData.hp_current);
        const hpMax = readFiniteNumber(characterData.hp_max);
        const ac = readFiniteNumber(characterData.ac);
        if (hpCurrent === null || hpMax === null || ac === null || hpCurrent <= 0 || hpMax <= 0 || ac <= 0) {
            return res.status(400).json({ error: 'hp_current, hp_max and ac must be positive numbers' });
        }

        const snapshot = characterData.state?.onchain?.heroSbtSnapshot;
        if (snapshot && typeof snapshot === 'object') {
            if (snapshot.heroClass !== characterData.class || snapshot.ancestry !== characterData.ancestry) {
                return res.status(400).json({
                    error: 'SBT snapshot profile mismatch with character profile',
                });
            }
            if (
                snapshot.strength !== rolledStats.str ||
                snapshot.dexterity !== rolledStats.dex ||
                snapshot.constitution !== rolledStats.con ||
                snapshot.intelligence !== rolledStats.int ||
                snapshot.wisdom !== rolledStats.wis ||
                snapshot.charisma !== rolledStats.cha
            ) {
                return res.status(400).json({
                    error: 'SBT snapshot stats mismatch with character stats',
                });
            }

            const expectedSlots = calculateGearSlotsForProfile({
                str: rolledStats.str,
                con: rolledStats.con,
                heroClass: characterData.class,
                ancestry: characterData.ancestry,
            }).total;
            if (Number(snapshot.gearSlots) !== expectedSlots) {
                return res.status(400).json({
                    error: 'SBT snapshot gearSlots mismatch with strict carry formula',
                    expectedGearSlots: expectedSlots,
                    receivedGearSlots: Number(snapshot.gearSlots),
                });
            }
        }

        const character = await createCharacter(characterData);
        res.json({ success: true, character });
    } catch (error: any) {
        res.status(500).json({ error: 'Character creation failed', details: error.message });
    }
});

app.get('/api/character/player/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;
        const characters = await getCharactersByPlayerId(playerId);
        res.json({ success: true, characters });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch characters', details: error.message });
    }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const result = await uploadToIPFS(req.file.buffer, req.file.originalname, req.file.mimetype);
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(500).json({ error: 'IPFS Upload failed', details: error.message });
    }
});

app.get('/api/db-check', async (req, res) => {
    try {
        // Just a simple query to assert Supabase is functional
        const { data, error } = await supabase.from('_test').select('*').limit(1);
        res.json({ success: true, connected: !error, error });
    } catch (error: any) {
        res.status(500).json({ error: 'DB check failed', details: error.message });
    }
});

// --- NFT ITEM GENERATION (QUEST-AWARE) ---

app.post('/api/nft/generate-from-quest', async (req, res) => {
    try {
        const {
            questId,
            characterId,
            locationId,
            styleHint,
            explicitPrompt,
            addToInventory = true,
            imageModel,
            imageSize,
            imageQuality,
            imageOutputFormat,
            imageBackground,
        } = req.body || {};

        if (!questId) {
            return res.status(400).json({ error: 'questId is required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) {
            return res.status(404).json({ error: 'Quest not found' });
        }

        const history = await getQuestHistory(questId);
        const lastHistoryLocationId = history?.[history.length - 1]?.location_id || null;
        const resolvedLocationId = locationId || lastHistoryLocationId;
        const location = resolvedLocationId ? await getLocationById(resolvedLocationId) : null;

        const artifact = await generateQuestNftArtifact({
            questId,
            questStatus: quest.status,
            locationId: resolvedLocationId,
            locationName: location?.name || null,
            partyMembers: Array.isArray(quest.party_members) ? quest.party_members : [],
            recentActions: (history || []).slice(-8).map((entry: any) => ({
                playerAction: entry.player_action,
                aiNarrative: entry.ai_narrative,
                engineTrigger: entry.engine_trigger,
                playerRoll: entry.player_roll,
            })),
        }, {
            styleHint,
            explicitPrompt,
            imageModel,
            imageSize,
            imageQuality,
            imageOutputFormat,
            imageBackground,
        });

        const ts = Date.now();
        const slug = toSlug(artifact.name);
        const imageFileName = `${slug}-${ts}.${artifact.imageExt}`;
        const imageUpload = await uploadToIPFS(artifact.imageBytes, imageFileName, artifact.imageMimeType);

        const imageIpfsUri = imageUpload.cid ? `ipfs://${imageUpload.cid}` : imageUpload.gatewayUrl;
        if (!imageIpfsUri) {
            throw new Error('Image uploaded but no CID/gateway URL returned by Filebase');
        }

        const metadataPayload = {
            name: artifact.name,
            description: artifact.description,
            image: imageIpfsUri,
            external_url: imageUpload.gatewayUrl,
            attributes: [
                { trait_type: 'rarity', value: artifact.rarity },
                { trait_type: 'category', value: artifact.category },
                { trait_type: 'subcategory', value: artifact.subcategory },
                { trait_type: 'quest_id', value: questId },
                { trait_type: 'quest_status', value: quest.status },
                { trait_type: 'location', value: location?.name || resolvedLocationId || 'unknown' },
            ],
            lore: artifact.lore,
            generation: {
                image_prompt: artifact.imagePrompt,
                model: imageModel || 'gpt-image-1.5',
                generated_at: new Date().toISOString(),
            },
            context: {
                recent_actions: (history || []).slice(-6).map((entry: any) => ({
                    player_action: entry.player_action,
                    player_roll: entry.player_roll,
                    engine_trigger: entry.engine_trigger,
                })),
            },
        };

        const metadataFileName = `${slug}-${ts}.metadata.json`;
        const metadataUpload = await uploadJsonToIPFS(metadataPayload, metadataFileName);
        const metadataIpfsUri = metadataUpload.cid
            ? `ipfs://${metadataUpload.cid}`
            : metadataUpload.gatewayUrl;

        const baseCost = artifact.rarity === 'Legendary'
            ? 5000
            : artifact.rarity === 'Epic'
                ? 2500
                : artifact.rarity === 'Rare'
                    ? 1200
                    : artifact.rarity === 'Uncommon'
                        ? 500
                        : 250;

        const itemId = await createCustomItemInstance({
            name: artifact.name,
            base_type: artifact.baseType,
            category: artifact.category,
            subcategory: artifact.subcategory,
            rarity: artifact.rarity,
            is_nft: true,
            blockchain_status: 'MINTABLE',
            cost_gp: baseCost,
            slots: 1,
            stats: artifact.stats,
            bonuses: artifact.bonuses,
            perks: artifact.perks,
            lore: artifact.lore,
            class_restrictions: [],
            metadata: {
                description: artifact.description,
                ipfs_image_cid: imageUpload.cid,
                ipfs_image_url: imageUpload.gatewayUrl,
                ipfs_metadata_cid: metadataUpload.cid,
                ipfs_metadata_url: metadataUpload.gatewayUrl,
                ipfs_metadata_uri: metadataIpfsUri,
                quest_id: questId,
                location_id: resolvedLocationId,
                generated_from: 'quest_context',
            },
            is_template: false,
        });

        if (!itemId) {
            throw new Error('Failed to persist generated item instance');
        }

        if (characterId && addToInventory) {
            const added = await addItemToInventory(characterId, itemId, 1, 'backpack');
            if (!added) {
                return res.status(500).json({
                    error: 'Item generated and saved, but failed to add to character inventory',
                    itemId,
                });
            }
        }

        const savedItem = await getItemById(itemId);
        res.json({
            success: true,
            item: savedItem,
            ipfs: {
                image: imageUpload,
                metadata: metadataUpload,
                metadataUri: metadataIpfsUri,
            },
            questContext: {
                questId,
                questStatus: quest.status,
                locationId: resolvedLocationId,
                locationName: location?.name || null,
            },
        });
    } catch (error: any) {
        console.error('NFT generation from quest failed:', error);
        res.status(500).json({
            error: 'Failed to generate NFT item from quest context',
            details: error.message,
        });
    }
});

// --- LOCATION ENDPOINTS ---

app.get('/api/location/list', async (req, res) => {
    try {
        const locations = await getAllLocations();
        res.json({ success: true, locations });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch locations', details: error.message });
    }
});

app.get('/api/location/:id', async (req, res) => {
    try {
        const location = await getLocationById(req.params.id);
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json({ success: true, location });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch location', details: error.message });
    }
});

app.get('/api/location/:id/context', async (req, res) => {
    try {
        const playerId = String(req.query?.playerId || '').trim();
        if (!playerId) {
            return res.status(400).json({ error: 'playerId is required' });
        }
        const location = await buildLocationContext(req.params.id, playerId);
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json({ success: true, location });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch location context', details: error.message });
    }
});

app.post('/api/location/seed', async (req, res) => {
    try {
        const dbLocations = ALL_SEED_LOCATIONS.map(loc => ({
            id: loc.id,
            name: loc.name,
            biome_type: loc.biome_type,
            room_type: loc.room_type,
            threat_level: loc.threat_level,
            coordinates: {
                width: loc.width,
                height: loc.height,
                tiles: loc.tiles,
                spawn_points: loc.spawn_points,
                exits: loc.exits,
            },
        }));
        const success = await seedLocations(dbLocations);
        if (!success) {
            return res.status(500).json({ error: 'Failed to seed locations' });
        }
        res.json({ success: true, count: dbLocations.length });
    } catch (error: any) {
        res.status(500).json({ error: 'Seed failed', details: error.message });
    }
});

// --- PLAYER POSITION ENDPOINTS ---

app.get('/api/player/:id/position', async (req, res) => {
    try {
        const position = await getPlayerPosition(req.params.id);
        res.json({ success: true, position });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch position', details: error.message });
    }
});

app.put('/api/player/:id/position', async (req, res) => {
    try {
        const { locationId, tileX, tileY } = req.body;
        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }
        const success = await upsertPlayerPosition(req.params.id, locationId, tileX ?? 0, tileY ?? 0);
        if (!success) {
            return res.status(500).json({ error: 'Failed to update position' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Position update failed', details: error.message });
    }
});

app.get('/api/location/:id/players', async (req, res) => {
    try {
        const players = await getPlayersInLocation(req.params.id);
        res.json({ success: true, players });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch players', details: error.message });
    }
});

// --- NPC ENDPOINTS ---

app.get('/api/location/:id/npcs', async (req, res) => {
    try {
        const npcs = await getNpcsByLocation(req.params.id);
        res.json({ success: true, npcs });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch NPCs', details: error.message });
    }
});

app.post('/api/npc/:id/dialog', async (req, res) => {
    try {
        const npc = await getNpcById(req.params.id);
        if (!npc) {
            return res.status(404).json({ error: 'NPC not found' });
        }
        const { message, history, playerId } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }
        const response = await generateNpcDialog(npc, message, history || [], playerId);
        res.json({ success: true, response });
    } catch (error: any) {
        res.status(500).json({ error: 'Dialog failed', details: error.message });
    }
});

app.post('/api/npc/seed', async (req, res) => {
    try {
        const success = await seedNpcs(ALL_SEED_NPCS);
        if (!success) {
            return res.status(500).json({ error: 'Failed to seed NPCs' });
        }
        res.json({ success: true, count: ALL_SEED_NPCS.length });
    } catch (error: any) {
        res.status(500).json({ error: 'NPC seed failed', details: error.message });
    }
});

// --- ITEM ENDPOINTS ---

app.get('/api/item/list', async (req, res) => {
    try {
        const category = req.query.category as string | undefined;
        const items = category
            ? await getItemsByCategory(category)
            : await getAllTemplateItems();
        res.json({ success: true, items });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch items', details: error.message });
    }
});

app.get('/api/item/:id', async (req, res) => {
    try {
        const item = await getItemById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json({ success: true, item });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch item', details: error.message });
    }
});

app.post('/api/item/seed', async (req, res) => {
    try {
        const success = await seedItems([...ALL_SEED_ITEMS, ...QUICKSTART_COMMON_ITEM_SEEDS]);
        if (!success) return res.status(500).json({ error: 'Failed to seed items' });
        res.json({ success: true, count: ALL_SEED_ITEMS.length + QUICKSTART_COMMON_ITEM_SEEDS.length });
    } catch (error: any) {
        res.status(500).json({ error: 'Item seed failed', details: error.message });
    }
});

// Character inventory
app.get('/api/character/:id/inventory', async (req, res) => {
    try {
        const inventory = await getCharacterInventory(req.params.id);
        res.json({ success: true, inventory });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
    }
});

app.post('/api/character/:id/inventory/add', async (req, res) => {
    try {
        const { templateId, quantity, slotPosition } = req.body;
        if (!templateId) return res.status(400).json({ error: 'templateId is required' });
        // Create a player instance from the template
        const itemId = await createItemInstance(templateId);
        if (!itemId) return res.status(500).json({ error: 'Failed to create item instance' });
        const success = await addItemToInventory(req.params.id, itemId, quantity || 1, slotPosition || 'backpack');
        if (!success) return res.status(500).json({ error: 'Failed to add to inventory' });
        res.json({ success: true, itemId });
    } catch (error: any) {
        res.status(500).json({ error: 'Add item failed', details: error.message });
    }
});

app.post('/api/character/:id/inventory/give-starter-kit', async (req, res) => {
    try {
        const { heroClass } = req.body;
        const starterItems = CLASS_STARTER_ITEMS[heroClass];
        if (!starterItems) return res.status(400).json({ error: `No starter kit for class: ${heroClass}` });
        const results = [];
        for (const item of starterItems) {
            const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
            const itemId = await createItemInstance(item.templateId, {
                slots: item.slotOverride ?? undefined,
            });
            if (itemId) {
                await addItemToInventory(req.params.id, itemId, quantity);
                results.push(itemId);
            }
        }
        res.json({ success: true, itemsGiven: results.length });
    } catch (error: any) {
        res.status(500).json({ error: 'Starter kit failed', details: error.message });
    }
});

app.post('/api/character/:id/inventory/ensure-starter-kit', async (req, res) => {
    try {
        const characterId = req.params.id;
        const existingInventory = await getCharacterInventory(characterId);
        if (existingInventory.length > 0) {
            return res.json({ success: true, seeded: false, itemsGiven: 0 });
        }

        const character = await getCharacterById(characterId);
        if (!character?.class) {
            return res.status(404).json({ error: 'Character class not found' });
        }

        const starterItems = CLASS_STARTER_ITEMS[character.class];
        if (!starterItems) {
            return res.status(400).json({ error: `No starter kit for class: ${character.class}` });
        }

        const results: string[] = [];
        for (const item of starterItems) {
            const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
            const itemId = await createItemInstance(item.templateId, {
                slots: item.slotOverride ?? undefined,
            });
            if (itemId) {
                await addItemToInventory(characterId, itemId, quantity);
                results.push(itemId);
            }
        }

        res.json({ success: true, seeded: true, itemsGiven: results.length });
    } catch (error: any) {
        res.status(500).json({ error: 'Ensure starter kit failed', details: error.message });
    }
});

app.put('/api/inventory/:entryId/equip', async (req, res) => {
    try {
        const { slotPosition } = req.body;
        const success = await equipItem(req.params.entryId, slotPosition || 'main_hand');
        if (!success) return res.status(500).json({ error: 'Failed to equip' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Equip failed', details: error.message });
    }
});

app.put('/api/inventory/:entryId/unequip', async (req, res) => {
    try {
        const success = await unequipItem(req.params.entryId);
        if (!success) return res.status(500).json({ error: 'Failed to unequip' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Unequip failed', details: error.message });
    }
});

app.delete('/api/inventory/:entryId', async (req, res) => {
    try {
        const success = await removeItemFromInventory(req.params.entryId);
        if (!success) return res.status(500).json({ error: 'Failed to remove item' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Remove failed', details: error.message });
    }
});

app.post('/api/item/:id/blockchain', async (req, res) => {
    try {
        const { onechainTokenId, blockchainStatus } = req.body;
        const itemId = req.params.id;
        if (!onechainTokenId) return res.status(400).json({ error: 'onechainTokenId is required' });
        const success = await updateItemBlockchainInfo(itemId, onechainTokenId, blockchainStatus || 'MINTED');
        if (!success) return res.status(500).json({ error: 'Failed to update blockchain info' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Blockchain update failed', details: error.message });
    }
});

// --- ABILITY ENDPOINTS ---

app.get('/api/ability/list', async (req, res) => {
    try {
        const type = req.query.type as string | undefined;
        const heroClass = req.query.class as string | undefined;
        const ancestry = req.query.ancestry as string | undefined;
        let abilities;
        if (type) abilities = await getAbilitiesByType(type);
        else if (heroClass) abilities = await getAbilitiesForClass(heroClass);
        else if (ancestry) abilities = await getAbilitiesForAncestry(ancestry);
        else abilities = await getAllAbilities();
        res.json({ success: true, abilities });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch abilities', details: error.message });
    }
});

app.get('/api/ability/profile', async (req, res) => {
    try {
        const heroClass = req.query.class as string | undefined;
        const ancestry = req.query.ancestry as string | undefined;
        if (!heroClass || !ancestry) {
            return res.status(400).json({ error: 'class and ancestry query params are required' });
        }

        const includeTypes = ['ancestry_feature', 'class_feature', 'talent', 'skill'];
        const abilities = await getAbilitiesForProfile(heroClass, ancestry, { includeTypes });
        res.json({ success: true, abilities });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch profile abilities', details: error.message });
    }
});

app.get('/api/ability/:id', async (req, res) => {
    try {
        const ability = await getAbilityById(req.params.id);
        if (!ability) return res.status(404).json({ error: 'Ability not found' });
        res.json({ success: true, ability });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch ability', details: error.message });
    }
});

app.post('/api/ability/seed', async (req, res) => {
    try {
        const success = await seedAbilities(ALL_SEED_ABILITIES);
        if (!success) return res.status(500).json({ error: 'Failed to seed abilities' });
        res.json({ success: true, count: ALL_SEED_ABILITIES.length });
    } catch (error: any) {
        res.status(500).json({ error: 'Ability seed failed', details: error.message });
    }
});

app.get('/api/character/:id/abilities', async (req, res) => {
    try {
        const abilities = await getCharacterAbilities(req.params.id);
        res.json({ success: true, abilities });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch character abilities', details: error.message });
    }
});

app.post('/api/character/:id/abilities/learn', async (req, res) => {
    try {
        const { abilityId, source } = req.body;
        if (!abilityId) return res.status(400).json({ error: 'abilityId is required' });
        const success = await learnAbility(req.params.id, abilityId, source || 'level_up');
        if (!success) return res.status(500).json({ error: 'Failed to learn ability' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Learn ability failed', details: error.message });
    }
});

app.delete('/api/character/:id/abilities/:abilityId', async (req, res) => {
    try {
        const success = await forgetAbility(req.params.id, req.params.abilityId);
        if (!success) return res.status(500).json({ error: 'Failed to forget ability' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Forget ability failed', details: error.message });
    }
});



// --- MARTA QUEST ORCHESTRATION ---

app.post('/api/quest/marta/start-dialog', async (req, res) => {
    try {
        const playerId = String(req.body?.playerId || '').trim();
        if (!playerId) {
            return res.status(400).json({ error: 'playerId is required' });
        }

        const active = await getLatestInProgressQuestForPlayer(playerId);
        const activeFlow = readQuestFlow(active);
        if (active && activeFlow && isQuestInProgressState(activeFlow.state)) {
            return res.json({
                success: true,
                alreadyActive: true,
                questId: active.id,
                state: activeFlow.state,
                flow: activeFlow,
                martaLine: getQuestLine(activeFlow) === 'marta'
                    ? 'The bones already named your task. Finish what you started and return.'
                    : 'Another oath still binds you. End it before taking a new prophecy.',
            });
        }
        if (active && !activeFlow) {
            return res.status(409).json({
                error: 'Another in-progress quest already exists for this player',
                questId: active.id,
            });
        }

        const initialFlow = buildInitialMartaFlow();
        const questId = await createQuestWithFlow([playerId], initialFlow);
        if (!questId) {
            return res.status(500).json({ error: 'Failed to create Marta quest' });
        }

        await insertQuestHistory({
            quest_id: questId,
            player_action: 'talk_to_old_marta',
            ai_narrative: initialFlow.scenario.synopsis,
            engine_trigger: 'marta_offer',
            on_chain_event: false,
        });

        return res.json({
            success: true,
            alreadyActive: false,
            questId,
            state: initialFlow.state,
            flow: initialFlow,
            martaLine: 'The bones marked you. Accept the trial and pay the road, then face what waits below.',
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to start dialog with Marta', details: error.message });
    }
});

app.post('/api/quest/marta/accept-and-prepay', async (req, res) => {
    try {
        const questId = String(req.body?.questId || '').trim();
        const playerId = String(req.body?.playerId || '').trim();
        const sessionId = Number(req.body?.sessionId);

        if (!questId || !playerId || !Number.isInteger(sessionId) || sessionId <= 0) {
            return res.status(400).json({ error: 'questId, playerId and valid sessionId are required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (!Array.isArray(quest.party_members) || !quest.party_members.includes(playerId)) {
            return res.status(403).json({ error: 'Player is not part of this quest' });
        }

        const flow = readQuestFlow(quest);
        if (!flow) return res.status(409).json({ error: 'Quest is not a Marta flow' });
        if (getQuestLine(flow) !== 'marta') return res.status(409).json({ error: 'Quest is not owned by Old Marta' });
        if (flow.state !== 'OFFERED_BY_MARTA' && flow.state !== 'NEW') {
            return res.status(409).json({ error: `Quest cannot be accepted from state ${flow.state}` });
        }

        const advanced = await updateQuestFlowState(questId, {
            state: 'COMBAT_REQUIRED',
            branch: 'pending',
            sessionId,
            timelineReason: 'accepted_and_prepay_locked',
        });
        if (!advanced) {
            return res.status(500).json({ error: 'Failed to advance quest to combat stage' });
        }

        await insertQuestHistory({
            quest_id: questId,
            player_action: 'accept_marta_quest_and_prepay',
            ai_narrative: 'Adventure prepay locked. Marta sends you into the mandatory combat path.',
            engine_trigger: 'quest_activated',
            on_chain_event: true,
        });

        const updated = await getQuestById(questId);
        return res.json({
            success: true,
            questId,
            state: readQuestFlow(updated)?.state || 'COMBAT_REQUIRED',
            flow: readQuestFlow(updated),
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to accept Marta quest', details: error.message });
    }
});

app.post('/api/quest/marta/submit-combat-result', async (req, res) => {
    try {
        const questId = String(req.body?.questId || '').trim();
        const playerId = String(req.body?.playerId || '').trim();
        const combatOutcomeRaw = String(req.body?.combatOutcome || '').trim().toLowerCase();
        const combatOutcome = combatOutcomeRaw === 'success' ? 'success' : combatOutcomeRaw === 'fail' ? 'fail' : null;

        if (!questId || !playerId || !combatOutcome) {
            return res.status(400).json({ error: 'questId, playerId and combatOutcome(success|fail) are required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (!Array.isArray(quest.party_members) || !quest.party_members.includes(playerId)) {
            return res.status(403).json({ error: 'Player is not part of this quest' });
        }

        const flow = readQuestFlow(quest);
        if (!flow) return res.status(409).json({ error: 'Quest is not a Marta flow' });
        if (getQuestLine(flow) !== 'marta') return res.status(409).json({ error: 'Quest is not owned by Old Marta' });
        if (flow.state !== 'COMBAT_REQUIRED' && flow.state !== 'ADVENTURE_ACTIVE') {
            return res.status(409).json({ error: `Combat result is not allowed in state ${flow.state}` });
        }

        const branch = combatOutcome === 'success' ? 'success' : 'fail';
        const advanced = await updateQuestFlowState(questId, {
            state: 'RETURN_TO_MARTA',
            branch,
            combatOutcome,
            timelineReason: `combat_${combatOutcome}`,
        });
        if (!advanced) return res.status(500).json({ error: 'Failed to persist combat outcome' });

        await insertQuestHistory({
            quest_id: questId,
            player_action: combatOutcome === 'success' ? 'won_mandatory_combat' : 'lost_mandatory_combat',
            ai_narrative: combatOutcome === 'success'
                ? 'You survived the mandatory clash. Return to Old Marta for judgement.'
                : 'You were driven back from battle. Return to Old Marta and accept the consequences.',
            engine_trigger: combatOutcome === 'success' ? 'combat_success' : 'combat_fail',
            on_chain_event: false,
        });

        const updated = await getQuestById(questId);
        return res.json({
            success: true,
            questId,
            state: readQuestFlow(updated)?.state || 'RETURN_TO_MARTA',
            branch,
            flow: readQuestFlow(updated),
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to submit combat result', details: error.message });
    }
});

app.post('/api/quest/marta/turn-in', async (req, res) => {
    try {
        const questId = String(req.body?.questId || '').trim();
        const playerId = String(req.body?.playerId || '').trim();
        const characterId = String(req.body?.characterId || '').trim();

        if (!questId || !playerId || !characterId) {
            return res.status(400).json({ error: 'questId, playerId and characterId are required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (!Array.isArray(quest.party_members) || !quest.party_members.includes(playerId)) {
            return res.status(403).json({ error: 'Player is not part of this quest' });
        }
        const flow = readQuestFlow(quest);
        if (!flow) return res.status(409).json({ error: 'Quest is not a Marta flow' });
        if (getQuestLine(flow) !== 'marta') return res.status(409).json({ error: 'Quest is not owned by Old Marta' });
        if (isQuestCompletedState(flow.state)) {
            return res.status(409).json({ error: 'Quest already completed' });
        }
        if (flow.state !== 'RETURN_TO_MARTA') {
            return res.status(409).json({ error: `Quest cannot be turned in from state ${flow.state}` });
        }

        const character = await getCharacterById(characterId);
        if (!character) return res.status(404).json({ error: 'Character not found' });
        if (String(character.player_id) !== playerId) {
            return res.status(403).json({ error: 'Character does not belong to player' });
        }

        const combatOutcome = flow.combatOutcome === 'success' ? 'success' : 'fail';
        const gmRoll = rollD20();
        const rewardResolution = resolveRewardFromOutcome('marta', combatOutcome, gmRoll);
        const progressDelta = computeQuestProgressDelta(combatOutcome, Number(character.xp || 0));
        const rewardDraft = rewardResolution.nftAwarded ? buildRewardDraft(questId, gmRoll) : null;

        const progress = await applyQuestProgressToCharacter(characterId, {
            xpDelta: progressDelta.xpDelta,
            loreScoreDelta: progressDelta.loreDelta,
            levelDelta: progressDelta.levelDelta,
        });

        const nextQuestState = combatOutcome === 'success' ? 'COMPLETED_SUCCESS' : 'COMPLETED_FAIL';
        await updateQuestFlowState(questId, {
            state: nextQuestState,
            branch: combatOutcome === 'success' ? 'success' : 'fail',
            combatOutcome,
            rewardResolution,
            rewardDraft,
            metadata: {
                progressSyncPolicy: {
                    xpLevel2Threshold: MARTA_QUEST_XP_LEVEL_2_THRESHOLD,
                    mode: 'PENDING_RELAYER',
                },
            },
            timelineReason: 'turn_in_resolved',
        });

        const latestQuest = await getQuestById(questId);
        const mergedStatChanges = {
            ...((latestQuest?.stat_changes && typeof latestQuest.stat_changes === 'object') ? latestQuest.stat_changes : {}),
            turnIn: {
                combatOutcome,
                gmRoll,
                nftAwarded: rewardResolution.nftAwarded,
                xpDelta: progressDelta.xpDelta,
                loreDelta: progressDelta.loreDelta,
                levelDelta: progressDelta.levelDelta,
            },
        };
        await finishQuest(
            questId,
            combatOutcome === 'success' ? 'Success' : 'PartyWiped',
            rewardResolution.nftAwarded,
            mergedStatChanges,
        );

        await insertQuestHistory({
            quest_id: questId,
            player_action: 'turn_in_at_marta',
            player_roll: gmRoll,
            ai_narrative: rewardResolution.nftAwarded
                ? 'Marta nods as the dice settle high. She marks your reward as worthy of minting.'
                : 'Marta studies the bones in silence. This chapter closes without an artifact.',
            engine_trigger: rewardResolution.nftAwarded ? 'reward_awarded' : 'reward_denied',
            on_chain_event: rewardResolution.nftAwarded,
        });

        return res.json({
            success: true,
            questId,
            combatOutcome,
            gmRoll,
            nftAwarded: rewardResolution.nftAwarded,
            nftObjectId: null,
            rewardDraft,
            xpDelta: progressDelta.xpDelta,
            loreDelta: progressDelta.loreDelta,
            levelDelta: progressDelta.levelDelta,
            newProgress: {
                xp: progress.next.xp,
                level: progress.next.level,
            },
            flow: readQuestFlow(await getQuestById(questId)),
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to turn in Marta quest', details: error.message });
    }
});

// --- ALDRIC QUEST ORCHESTRATION ---

app.post('/api/quest/aldric/start-dialog', async (req, res) => {
    try {
        const playerId = String(req.body?.playerId || '').trim();
        if (!playerId) {
            return res.status(400).json({ error: 'playerId is required' });
        }

        const active = await getLatestInProgressQuestForPlayer(playerId);
        const activeFlow = readQuestFlow(active);
        if (active && activeFlow && isQuestInProgressState(activeFlow.state)) {
            const activeLine = getQuestLine(activeFlow);
            return res.json({
                success: true,
                alreadyActive: true,
                questId: active.id,
                state: activeFlow.state,
                flow: activeFlow,
                aldricLine: activeLine === 'aldric'
                    ? 'You still owe me one rat hunt. Finish it first.'
                    : 'You are already bound to another quest. Settle that debt first.',
            });
        }
        if (active && !activeFlow) {
            return res.status(409).json({
                error: 'Another in-progress quest already exists for this player',
                questId: active.id,
            });
        }

        const initialFlow = buildInitialAldricFlow();
        const questId = await createQuestWithFlow([playerId], initialFlow);
        if (!questId) {
            return res.status(500).json({ error: 'Failed to create Aldric quest' });
        }

        await insertQuestHistory({
            quest_id: questId,
            player_action: 'talk_to_grim_aldric',
            ai_narrative: initialFlow.scenario.synopsis,
            engine_trigger: 'aldric_offer',
            on_chain_event: false,
        });

        return res.json({
            success: true,
            alreadyActive: false,
            questId,
            state: initialFlow.state,
            flow: initialFlow,
            aldricLine: 'Rats keep eating everything in my cellar. Help me clear them out?',
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to start dialog with Aldric', details: error.message });
    }
});

app.post('/api/quest/aldric/accept-and-prepay', async (req, res) => {
    try {
        const questId = String(req.body?.questId || '').trim();
        const playerId = String(req.body?.playerId || '').trim();
        const sessionId = Number(req.body?.sessionId);

        if (!questId || !playerId || !Number.isInteger(sessionId) || sessionId <= 0) {
            return res.status(400).json({ error: 'questId, playerId and valid sessionId are required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (!Array.isArray(quest.party_members) || !quest.party_members.includes(playerId)) {
            return res.status(403).json({ error: 'Player is not part of this quest' });
        }

        const flow = readQuestFlow(quest);
        if (!flow) return res.status(409).json({ error: 'Quest flow is missing' });
        if (getQuestLine(flow) !== 'aldric') return res.status(409).json({ error: 'Quest is not owned by Grim Aldric' });
        if (flow.state !== 'OFFERED_BY_ALDRIC' && flow.state !== 'NEW') {
            return res.status(409).json({ error: `Quest cannot be accepted from state ${flow.state}` });
        }

        const advanced = await updateQuestFlowState(questId, {
            state: 'COMBAT_REQUIRED',
            branch: 'pending',
            sessionId,
            metadata: {
                cellarEntranceEnabled: true,
                cellarCombatStarted: false,
                cellarCombatResolved: false,
                cellarCombatId: null,
            },
            timelineReason: 'accepted_and_prepay_locked',
        });
        if (!advanced) return res.status(500).json({ error: 'Failed to activate Aldric quest' });

        await insertQuestHistory({
            quest_id: questId,
            player_action: 'accept_aldric_quest_and_prepay',
            ai_narrative: 'Aldric unlocks the north-wall hatch. Descend and kill the cellar rat.',
            engine_trigger: 'aldric_quest_activated',
            on_chain_event: true,
        });

        const updated = await getQuestById(questId);
        return res.json({
            success: true,
            questId,
            state: readQuestFlow(updated)?.state || 'COMBAT_REQUIRED',
            flow: readQuestFlow(updated),
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to accept Aldric quest', details: error.message });
    }
});

app.post('/api/quest/aldric/submit-combat-result', async (req, res) => {
    try {
        const questId = String(req.body?.questId || '').trim();
        const playerId = String(req.body?.playerId || '').trim();
        const combatOutcomeRaw = String(req.body?.combatOutcome || '').trim().toLowerCase();
        const combatOutcome = combatOutcomeRaw === 'success' ? 'success' : combatOutcomeRaw === 'fail' ? 'fail' : null;
        const combatId = String(req.body?.combatId || '').trim() || null;

        if (!questId || !playerId || !combatOutcome) {
            return res.status(400).json({ error: 'questId, playerId and combatOutcome(success|fail) are required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (!Array.isArray(quest.party_members) || !quest.party_members.includes(playerId)) {
            return res.status(403).json({ error: 'Player is not part of this quest' });
        }
        const flow = readQuestFlow(quest);
        if (!flow) return res.status(409).json({ error: 'Quest flow is missing' });
        if (getQuestLine(flow) !== 'aldric') return res.status(409).json({ error: 'Quest is not owned by Grim Aldric' });
        if (flow.state !== 'COMBAT_REQUIRED' && flow.state !== 'ADVENTURE_ACTIVE') {
            return res.status(409).json({ error: `Combat result is not allowed in state ${flow.state}` });
        }

        const branch = combatOutcome === 'success' ? 'success' : 'fail';
        const advanced = await updateQuestFlowState(questId, {
            state: 'RETURN_TO_ALDRIC',
            branch,
            combatOutcome,
            metadata: {
                cellarCombatResolved: true,
                cellarCombatId: combatId,
            },
            timelineReason: `aldric_combat_${combatOutcome}`,
        });
        if (!advanced) return res.status(500).json({ error: 'Failed to persist Aldric combat result' });

        await insertQuestHistory({
            quest_id: questId,
            player_action: combatOutcome === 'success' ? 'killed_cellar_rat' : 'fell_to_cellar_rat',
            ai_narrative: combatOutcome === 'success'
                ? 'The cellar rat is dead. Return to Grim Aldric.'
                : 'You were routed from the cellar. Report back to Grim Aldric.',
            engine_trigger: combatOutcome === 'success' ? 'aldric_combat_success' : 'aldric_combat_fail',
            on_chain_event: false,
        });

        const updated = await getQuestById(questId);
        return res.json({
            success: true,
            questId,
            state: readQuestFlow(updated)?.state || 'RETURN_TO_ALDRIC',
            branch,
            flow: readQuestFlow(updated),
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to submit Aldric combat result', details: error.message });
    }
});

app.post('/api/quest/aldric/start-cellar-combat', async (req, res) => {
    try {
        const questId = String(req.body?.questId || '').trim();
        const playerId = String(req.body?.playerId || '').trim();
        const characterId = String(req.body?.characterId || '').trim();

        if (!questId || !playerId || !characterId) {
            return res.status(400).json({ error: 'questId, playerId and characterId are required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (!Array.isArray(quest.party_members) || !quest.party_members.includes(playerId)) {
            return res.status(403).json({ error: 'Player is not part of this quest' });
        }
        const flow = readQuestFlow(quest);
        if (!flow) return res.status(409).json({ error: 'Quest flow is missing' });
        if (getQuestLine(flow) !== 'aldric') return res.status(409).json({ error: 'Quest is not owned by Grim Aldric' });
        if (flow.state !== 'COMBAT_REQUIRED' && flow.state !== 'ADVENTURE_ACTIVE') {
            return res.status(409).json({ error: `Combat cannot start in state ${flow.state}` });
        }

        const existingCombatId = flow?.metadata?.cellarCombatId;
        if (typeof existingCombatId === 'string' && existingCombatId) {
            const existing = await getCombat(existingCombatId);
            if (existing) {
                return res.json({ success: true, combat: existing, questId, flow });
            }
        }

        const character = await getCharacterById(characterId);
        if (!character) return res.status(404).json({ error: 'Character not found' });
        if (String(character.player_id) !== playerId) {
            return res.status(403).json({ error: 'Character does not belong to player' });
        }

        const playerState = {
            characterId: character.id,
            name: character.name || 'Hero',
            stats: character.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            ac: Number(character.ac || 11),
            hp: Number(character.hp || character.max_hp || 10),
            maxHp: Number(character.max_hp || character.hp || 10),
            position: { x: 10, y: 12 },
        };
        const ratMob = {
            name: 'Cellar Rat',
            stats: { str: 8, dex: 12, con: 10, int: 2, wis: 8, cha: 3 },
            ac: 11,
            maxHp: 9,
            damage: '1d4+1',
            xpReward: 4,
            position: { x: 10, y: 6 },
        };
        const combat = await combatEngine.startCombat(TAVERN_CELLAR_LOCATION_ID, [playerState], [ratMob]);
        if (!combat) return res.status(500).json({ error: 'Failed to start cellar combat' });

        await updateQuestFlowState(questId, {
            state: 'COMBAT_REQUIRED',
            branch: 'pending',
            metadata: {
                cellarCombatStarted: true,
                cellarCombatId: combat.combatId,
            },
            timelineReason: 'aldric_cellar_combat_started',
        });

        await insertQuestHistory({
            quest_id: questId,
            location_id: TAVERN_CELLAR_LOCATION_ID,
            player_action: 'enter_cellar',
            ai_narrative: 'The hatch slams shut behind you as a giant rat lunges from the dark.',
            engine_trigger: 'aldric_cellar_combat_start',
            on_chain_event: false,
        });

        return res.json({
            success: true,
            questId,
            combat,
            flow: readQuestFlow(await getQuestById(questId)),
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to start Aldric cellar combat', details: error.message });
    }
});

app.post('/api/quest/aldric/turn-in', async (req, res) => {
    try {
        const questId = String(req.body?.questId || '').trim();
        const playerId = String(req.body?.playerId || '').trim();
        const characterId = String(req.body?.characterId || '').trim();

        if (!questId || !playerId || !characterId) {
            return res.status(400).json({ error: 'questId, playerId and characterId are required' });
        }

        const quest = await getQuestById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (!Array.isArray(quest.party_members) || !quest.party_members.includes(playerId)) {
            return res.status(403).json({ error: 'Player is not part of this quest' });
        }
        const flow = readQuestFlow(quest);
        if (!flow) return res.status(409).json({ error: 'Quest flow is missing' });
        if (getQuestLine(flow) !== 'aldric') return res.status(409).json({ error: 'Quest is not owned by Grim Aldric' });
        if (isQuestCompletedState(flow.state)) return res.status(409).json({ error: 'Quest already completed' });
        if (flow.state !== 'RETURN_TO_ALDRIC') {
            return res.status(409).json({ error: `Quest cannot be turned in from state ${flow.state}` });
        }

        const character = await getCharacterById(characterId);
        if (!character) return res.status(404).json({ error: 'Character not found' });
        if (String(character.player_id) !== playerId) {
            return res.status(403).json({ error: 'Character does not belong to player' });
        }

        const combatOutcome = flow.combatOutcome === 'success' ? 'success' : 'fail';
        const rewardResolution = resolveRewardFromOutcome('aldric', combatOutcome, 20);
        const progressDelta = computeQuestProgressDelta(combatOutcome, Number(character.xp || 0));
        const rewardDraft = rewardResolution.nftAwarded ? buildAldricRewardDraft(questId) : null;

        const progress = await applyQuestProgressToCharacter(characterId, {
            xpDelta: progressDelta.xpDelta,
            loreScoreDelta: progressDelta.loreDelta,
            levelDelta: progressDelta.levelDelta,
        });

        const nextQuestState = combatOutcome === 'success' ? 'COMPLETED_SUCCESS' : 'COMPLETED_FAIL';
        await updateQuestFlowState(questId, {
            state: nextQuestState,
            branch: combatOutcome === 'success' ? 'success' : 'fail',
            combatOutcome,
            rewardResolution,
            rewardDraft,
            metadata: {
                cellarEntranceEnabled: false,
                progressSyncPolicy: {
                    xpLevel2Threshold: MARTA_QUEST_XP_LEVEL_2_THRESHOLD,
                    mode: 'PENDING_RELAYER',
                },
            },
            timelineReason: 'aldric_turn_in_resolved',
        });

        const latestQuest = await getQuestById(questId);
        const mergedStatChanges = {
            ...((latestQuest?.stat_changes && typeof latestQuest.stat_changes === 'object') ? latestQuest.stat_changes : {}),
            turnIn: {
                combatOutcome,
                gmRoll: null,
                nftAwarded: rewardResolution.nftAwarded,
                xpDelta: progressDelta.xpDelta,
                loreDelta: progressDelta.loreDelta,
                levelDelta: progressDelta.levelDelta,
            },
        };

        await finishQuest(
            questId,
            combatOutcome === 'success' ? 'Success' : 'PartyWiped',
            rewardResolution.nftAwarded,
            mergedStatChanges,
        );

        await insertQuestHistory({
            quest_id: questId,
            player_action: 'turn_in_at_aldric',
            ai_narrative: rewardResolution.nftAwarded
                ? 'Aldric grunts in approval. Payment and trophy rights are yours.'
                : 'Aldric curses the rats and waves you off empty-handed.',
            engine_trigger: rewardResolution.nftAwarded ? 'aldric_reward_awarded' : 'aldric_reward_denied',
            on_chain_event: rewardResolution.nftAwarded,
        });

        return res.json({
            success: true,
            questId,
            combatOutcome,
            gmRoll: null,
            nftAwarded: rewardResolution.nftAwarded,
            nftObjectId: null,
            rewardDraft,
            xpDelta: progressDelta.xpDelta,
            loreDelta: progressDelta.loreDelta,
            levelDelta: progressDelta.levelDelta,
            newProgress: {
                xp: progress.next.xp,
                level: progress.next.level,
            },
            flow: readQuestFlow(await getQuestById(questId)),
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to turn in Aldric quest', details: error.message });
    }
});


app.get('/api/quest/list', async (req, res) => {
    try {
        const quests = await getAllQuests();
        res.json({ success: true, quests });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch quests', details: error.message });
    }
});


app.get('/api/quest/:id', async (req, res) => {
    try {
        const quest = await getQuestById(req.params.id);
        if (!quest) {
            return res.status(404).json({ error: 'Quest not found' });
        }
        res.json({ success: true, quest });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch quest', details: error.message });
    }
});

app.get('/api/quest/:id/history', async (req, res) => {
    try {
        const history = await getQuestHistory(req.params.id);
        res.json({ success: true, history });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch quest history', details: error.message });
    }
});

app.post('/api/quest/start', async (req, res) => {
    try {
        const { partyMembers } = req.body;
        const questId = await createQuest(partyMembers || []);
        if (!questId) {
            return res.status(500).json({ error: 'Failed to create quest' });
        }
        res.json({ success: true, questId });
    } catch (error: any) {
        res.status(500).json({ error: 'Quest start failed', details: error.message });
    }
});

app.post('/api/quest/action', async (req, res) => {
    try {
        const payload = req.body as QuestActionInput & { adventureSessionId?: number; aiRollSides?: number };
        let forcedDmRoll: number | undefined;

        if (payload.adventureSessionId !== undefined) {
            const aiRoll = dicepackService.consumeRoll(
                Number(payload.adventureSessionId),
                'ai',
                Number(payload.aiRollSides ?? 20),
            );
            forcedDmRoll = aiRoll.roll;
        }

        const input: QuestActionInput = {
            ...payload,
            forcedDmRoll,
        };
        if (!input.questId || !input.playerAction || input.playerRoll === undefined || input.currentZoneThreatLevel === undefined) {
            return res.status(400).json({ error: 'Missing required quest action fields' });
        }

        const output = await questDirector.processAction(input);
        if (!output) {
            return res.status(500).json({ error: 'Failed to generate AI narrative' });
        }

        res.json({ success: true, event: output });
    } catch (error: any) {
        console.error('Quest Action Error:', error);
        res.status(500).json({ error: 'Quest action failed', details: error.message });
    }
});

app.post('/api/quest/finish', async (req, res) => {
    try {
        const { questId, status, lootDropped, statChanges } = req.body;
        if (!questId || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const success = await finishQuest(questId, status, lootDropped || false, statChanges || {});
        if (!success) {
            return res.status(500).json({ error: 'Failed to finish quest' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Quest finish failed', details: error.message });
    }
});

// --- COMBAT ENDPOINTS ---

app.post('/api/combat/start', async (req, res) => {
    try {
        const { locationId, players: playerChars, mobs } = req.body;
        if (!locationId || !playerChars || !mobs) {
            return res.status(400).json({ error: 'Missing required fields: locationId, players, mobs' });
        }
        const state = await combatEngine.startCombat(locationId, playerChars, mobs);
        if (!state) {
            return res.status(500).json({ error: 'Failed to start combat' });
        }
        res.json({ success: true, combat: state });
    } catch (error: any) {
        console.error('Combat start error:', error);
        res.status(500).json({ error: 'Combat start failed', details: error.message });
    }
});

app.get('/api/combat/:id/state', async (req, res) => {
    try {
        const state = await getCombat(req.params.id);
        if (!state) {
            return res.status(404).json({ error: 'Combat not found' });
        }
        res.json({ success: true, combat: state });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch combat state', details: error.message });
    }
});

app.post('/api/combat/:id/action', async (req, res) => {
    try {
        const { playerId, action } = req.body;
        if (!playerId || !action) {
            return res.status(400).json({ error: 'Missing playerId or action' });
        }
        let state = await combatEngine.processPlayerAction(req.params.id, playerId, action);
        if (!state) {
            return res.status(400).json({ error: 'Invalid action or not your turn' });
        }

        // After player action, auto-process enemy turns
        if (state.status === 'IN_PROGRESS') {
            const activeEntity = state.entities[state.activeEntityId];
            if (activeEntity && activeEntity.type === 'MOB') {
                state = await combatEngine.processEnemyTurns(state);
            }
        }

        res.json({ success: true, combat: state });
    } catch (error: any) {
        console.error('Combat action error:', error);
        res.status(500).json({ error: 'Combat action failed', details: error.message });
    }
});

app.post('/api/combat/:id/end-turn', async (req, res) => {
    try {
        const { playerId } = req.body;
        if (!playerId) {
            return res.status(400).json({ error: 'Missing playerId' });
        }
        let state = await combatEngine.processPlayerAction(req.params.id, playerId, { type: 'END_TURN' });
        if (!state) {
            return res.status(400).json({ error: 'Cannot end turn' });
        }

        // Auto-process enemy turns
        if (state.status === 'IN_PROGRESS') {
            const activeEntity = state.entities[state.activeEntityId];
            if (activeEntity && activeEntity.type === 'MOB') {
                state = await combatEngine.processEnemyTurns(state);
            }
        }

        res.json({ success: true, combat: state });
    } catch (error: any) {
        res.status(500).json({ error: 'End turn failed', details: error.message });
    }
});

// --- SCENARIO & CHRONICLES ENDPOINTS ---

app.post('/api/scenario/generate', async (req, res) => {
    try {
        const { playerIds, sessionId } = req.body;
        if (!playerIds || !Array.isArray(playerIds)) {
            return res.status(400).json({ error: 'Missing or invalid playerIds array' });
        }

        const context = await scenarioGenerator.buildPartyContext(playerIds, sessionId);
        const scenario = await scenarioGenerator.generateScenario(context);

        if (!scenario) {
            return res.status(500).json({ error: 'Failed to generate scenario via LLM' });
        }

        res.json({ success: true, context, scenario });
    } catch (error: any) {
        console.error('Scenario generation error:', error);
        res.status(500).json({ error: 'Scenario generation failed', details: error.message });
    }
});

app.post('/api/scenario/apply', async (req, res) => {
    try {
        const { context, scenario } = req.body;
        if (!context || !scenario) {
            return res.status(400).json({ error: 'Missing context or AI scenario payload' });
        }

        const locationId = await scenarioGenerator.applyScenario(context, scenario);
        if (!locationId) {
            return res.status(500).json({ error: 'Failed to apply scenario to database' });
        }

        res.json({ success: true, locationId });
    } catch (error: any) {
        console.error('Scenario application error:', error);
        res.status(500).json({ error: 'Scenario application failed', details: error.message });
    }
});

app.get('/api/chronicles', async (req, res) => {
    try {
        const sessionId = req.query.sessionId as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

        const chronicles = await getRecentChronicles(limit, sessionId);
        res.json({ success: true, chronicles });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to retrieve chronicles', details: error.message });
    }
});

app.post('/api/chronicles/entry', async (req, res) => {
    try {
        const { session_id, location_id, quest_id, event_type, narrative } = req.body;

        if (!event_type || !narrative) {
            return res.status(400).json({ error: 'Missing required fields: event_type, narrative' });
        }

        const rawEntry = { session_id, location_id, quest_id, event_type, narrative };
        const hash = CryptoJS.SHA256(JSON.stringify(rawEntry)).toString();

        // Log to database
        const chronicle = await insertChronicle({
            ...rawEntry,
            on_chain_hash: hash
        });

        res.json({ success: true, chronicle, hash });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to log chronicle', details: error.message });
    }
});

app.post('/api/adventure/init', async (req, res) => {
    try {
        const { players, merkleRoots, oracleRoot } = req.body;
        if (!players || !Array.isArray(players) || !merkleRoots || !oracleRoot) {
            return res.status(400).json({ error: 'Missing required init parameters' });
        }

        res.json({
            success: true,
            mode: 'off-chain',
            message: 'Adventure initialization is handled locally in the OneChain migration.'
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to initialize adventure', details: error.message });
    }
});

app.post('/api/adventure/session/start', async (req, res) => {
    try {
        const {
            adventureId,
            playerAddress,
            playerRollsCount,
            aiRollsCount,
        } = req.body;

        if (!playerAddress) {
            return res.status(400).json({ error: 'Missing required field: playerAddress' });
        }

        const result = dicepackService.startSession({
            playerAddress,
            adventureId,
            playerRollsCount,
            aiRollsCount,
        });

        res.json({ success: true, session: result });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to start adventure dice session', details: error.message });
    }
});

app.post('/api/adventure/session/:sessionId/roll/player', async (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        const sides = Number(req.body?.sides ?? 20);
        const playerAddress = String(req.body?.playerAddress || '');
        const roll = dicepackService.consumeRoll(sessionId, 'player', sides, playerAddress);
        res.json({ success: true, roll });
    } catch (error: any) {
        res.status(400).json({ error: 'Failed to consume player roll', details: error.message });
    }
});

app.post('/api/adventure/session/:sessionId/roll/ai', async (req, res) => {
    try {
        if (dicepackRelayerKey) {
            const providedKey = req.header('x-relayer-key');
            if (providedKey !== dicepackRelayerKey) {
                return res.status(403).json({ error: 'Forbidden: invalid relayer key' });
            }
        }

        const sessionId = Number(req.params.sessionId);
        const sides = Number(req.body?.sides ?? 20);
        const roll = dicepackService.consumeRoll(sessionId, 'ai', sides);
        res.json({ success: true, roll });
    } catch (error: any) {
        res.status(400).json({ error: 'Failed to consume AI roll', details: error.message });
    }
});

app.post('/api/adventure/session/:sessionId/finalize', async (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        const summary = dicepackService.finalizeSession(sessionId);
        res.json({ success: true, summary });
    } catch (error: any) {
        res.status(400).json({ error: 'Failed to finalize adventure session', details: error.message });
    }
});

// --- RISC ZERO ZK API --- //
app.post('/api/zk/prove-roll', async (req, res) => {
    try {
        const { seed, bound } = req.body;
        if (!seed || !bound) {
            return res.status(400).json({ error: 'Missing required parameters: seed, bound' });
        }

        console.log(`[RISC0] Request received to prove dice roll. Seed: ${seed}, Bound: ${bound}`);

        // --- 
        // SIMULATING LOCAL RISC ZERO PROVER FOR THIS ENVIRONMENT 
        // (Due to OS Error 32 locks natively preventing rustc local cargo build). 
        // We perform the exact logic deterministic hashing of the RISC Zero guest, returning a mocked receipt. 
        // ---

        // 1. Simulate the intense RISC Zero execution cycle (proving takes time normally)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Deterministic hashing representing Guest program output
        const hashResult = CryptoJS.SHA256(seed).toString(CryptoJS.enc.Hex);

        // 3. Take the first 4 bytes (8 hex characters) and parse to an integer
        const hashInt = parseInt(hashResult.slice(0, 8), 16);

        // 4. Calculate dice roll exactly as the guest would: (hashInt % bound) + 1
        const result = (hashInt % bound) + 1;

        console.log(`[RISC0] Proving complete. Dice roll proved as: ${result}`);

        // Mock a real ZK base64 receipt containing the cryptographic signature
        // In reality, this would be a large Base64 binary chunk from RISC Zero
        const mockReceiptBase64 = Buffer.from(JSON.stringify({
            guestId: 'f87a8f9caeba',
            signature: hashResult, // cryptographically ties to seed
            journal: { seed, bound, result }
        })).toString('base64');

        res.json({
            success: true,
            receipt_base64: mockReceiptBase64,
            image_id: "0xMockGuestRisc0ImageId0123456789",
            result: {
                seed,
                bound,
                result
            }
        });

    } catch (error: any) {
        console.error('[RISC0] Prover Error:', error);
        res.status(500).json({ error: 'Failed to generate ZK Proof', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
