import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import CryptoJS from 'crypto-js';

import { supabase } from './db/supabase';
import { uploadToIPFS } from './services/ipfs';
import { upsertPlayerByWallet } from './db/playerQueries';
import { createCharacter, getCharacterById, getCharactersByPlayerId } from './db/characterQueries';
import { createQuest, finishQuest, getAllQuests, getQuestById, getQuestHistory, seedLocations, getAllLocations, getLocationById, upsertPlayerPosition, getPlayerPosition, getPlayersInLocation } from './db/questQueries';
import { getNpcsByLocation, getNpcById, seedNpcs } from './db/npcQueries';
import { seedItems, getAllTemplateItems, getItemsByCategory, getItemById, createItemInstance, addItemToInventory, getCharacterInventory, removeItemFromInventory, equipItem, unequipItem, updateItemBlockchainInfo } from './db/itemQueries';
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
import { dicepackService } from './services/dicepack';
import { onechainContractMeta, onechainEntryTargets, isOnechainContractConfigured } from './services/onechainContract';

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

app.post('/api/character/create', async (req, res) => {
    try {
        const characterData = req.body;

        // Basic validation
        if (!characterData.playerId || !characterData.name || !characterData.class || !characterData.ancestry) {
            return res.status(400).json({ error: 'Missing required character fields' });
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
        for (const templateId of starterItems) {
            const itemId = await createItemInstance(templateId);
            if (itemId) {
                await addItemToInventory(req.params.id, itemId);
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
        for (const templateId of starterItems) {
            const itemId = await createItemInstance(templateId);
            if (itemId) {
                await addItemToInventory(characterId, itemId);
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
