import { NpcData } from '../db/npcQueries';

const LOC_TAVERN = '00000000-0000-4000-a000-000000000001';
const LOC_STREET = '00000000-0000-4000-a000-000000000004';
const LOC_CHURCH = '00000000-0000-4000-a000-000000000005';
const LOC_WIZARD_SHOP = '00000000-0000-4000-a000-000000000006';
const LOC_CASTLE_GATE = '00000000-0000-4000-a000-000000000007';

export const ALL_SEED_NPCS: NpcData[] = [
    // ── TAVERN ──────────────────────────────────────────────────────
    {
        id: '10000000-0000-4000-a000-000000000001',
        name: 'Grim Aldric',
        title: 'Bartender',
        location_id: LOC_TAVERN,
        tile_x: 9,
        tile_y: 9,
        sprite_color: '#8b6914',
        traits: {
            gruff: true,
            secretlyKind: true,
            oneArmed: true,
            fears: ['betrayal'],
        },
        backstory: [
            { chapter: 'origin', text: 'Former mercenary who lost his sword arm in the Siege of Ashfall.' },
            { chapter: 'tavern', text: 'Bought The Dying Ember with his last coins. Has run it for 15 years.' },
            { chapter: 'reputation', text: 'Knows every rumor that passes through town because drunk men talk too freely.' },
        ],
        knowledge: [
            { topic: 'rumors', content: 'Strange lights have been seen near the castle gate at night. The guards refuse to investigate.' },
            { topic: 'castle_history', content: 'The castle was built 300 years ago by King Aldred the Stern. It has never fallen to siege.' },
            { topic: 'monsters', content: 'Creatures crawl from the Hollow Crypts after dark. Mostly skeletons, but some say worse things lurk deeper.' },
            { topic: 'weapons', content: 'If you need a blade, the old blacksmith on the east road does decent work. Expensive, but reliable.' },
            { topic: 'church_secret', content: 'Father Cael is hiding something in the church basement. I hear chanting some nights.' },
            { topic: 'wizard', content: 'That elf Aelindra does midnight rituals. Blue light seeps under her door. Nobody dares ask what she does.' },
        ],
        memory: [],
        metadata: {
            appearance: 'Massive, one-armed man with a scarred face and a grey beard. Wears a stained leather apron.',
            voice: 'low, gravelly',
            greeting: 'What\'ll it be?',
        },
    },
    {
        id: '10000000-0000-4000-a000-000000000002',
        name: 'Old Marta',
        title: 'Fortune Teller',
        location_id: LOC_TAVERN,
        tile_x: 3,
        tile_y: 5,
        sprite_color: '#6a0dad',
        traits: {
            cryptic: true,
            whispering: true,
            slightlyUnhinged: true,
            occasionallyLucid: true,
        },
        backstory: [
            { chapter: 'origin', text: 'Once a court seer for the old king before his fall.' },
            { chapter: 'fall', text: 'When the king died, she lost her position and her mind — or so they say.' },
            { chapter: 'present', text: 'Now she reads bone dice for copper coins in the tavern corner. Her prophecies always come true — just never the way you expect.' },
        ],
        knowledge: [
            { topic: 'prophecy', content: 'The bones speak of a darkness beneath the stones. Three keys, three doors, three prices to pay.' },
            { topic: 'royal_bloodline', content: 'The old king had a hidden heir. The child was spirited away during the siege. Could be anyone now.' },
            { topic: 'dungeon_artifacts', content: 'Deep in the Hollow Crypts lies the Crown of Whispers. It lets you hear the dead — but they hear you too.' },
            { topic: 'curse', content: 'The Dark Forest is cursed. Those who enter at midnight never return the same. Some don\'t return at all.' },
            { topic: 'sealed_evil', content: 'Something sleeps beneath the crypts. The old king sealed it there. The seal weakens with each passing year.' },
        ],
        memory: [],
        metadata: {
            appearance: 'Hunched crone wrapped in tattered purple shawls. Milky white eyes that seem to see through you. Bone dice always in hand.',
            voice: 'thin, whispering',
            greeting: 'The bones told me you would come...',
        },
    },

    // ── STREET ──────────────────────────────────────────────────────
    {
        id: '10000000-0000-4000-a000-000000000003',
        name: 'Guard Theron',
        title: 'City Watch',
        location_id: LOC_STREET,
        tile_x: 11,
        tile_y: 6,
        sprite_color: '#4a7c59',
        traits: {
            dutiful: true,
            suspicious: true,
            tired: true,
            secretlyHatesJob: true,
        },
        backstory: [
            { chapter: 'origin', text: 'Born in the castle district, joined the watch at 16.' },
            { chapter: 'service', text: 'Has patrolled these streets for 20 years. Witnessed the last siege and still flinches at loud noises.' },
            { chapter: 'loyalty', text: 'His captain, Sergeant Bryn at the gate, is the only person he truly respects.' },
        ],
        knowledge: [
            { topic: 'laws', content: 'No weapons drawn in the market district. Curfew after the second bell. Thieves lose a hand.' },
            { topic: 'crimes', content: 'There have been break-ins at the merchant quarter. Someone is stealing spell components.' },
            { topic: 'smugglers', content: 'Smugglers use the church cellar at night. I reported it to the captain but nothing happened.' },
            { topic: 'undead', content: 'Something is wrong beyond the gate. The night watch keeps finding claw marks on the outer walls.' },
        ],
        memory: [],
        metadata: {
            appearance: 'Lean, armored man with dark circles under his eyes. Carries a notched halberd and a dented shield with the city crest.',
            voice: 'flat, bored',
            greeting: 'Move along. Or state your business.',
        },
    },

    // ── CHURCH ──────────────────────────────────────────────────────
    {
        id: '10000000-0000-4000-a000-000000000004',
        name: 'Father Cael',
        title: 'High Priest',
        location_id: LOC_CHURCH,
        tile_x: 7,
        tile_y: 3,
        sprite_color: '#c0c0c0',
        traits: {
            calm: true,
            measured: true,
            hidingGuilt: true,
            devout: true,
        },
        backstory: [
            { chapter: 'origin', text: 'A devout priest of the Ash God who took his vows 30 years ago.' },
            { chapter: 'dark_bargain', text: 'During the siege, he made a pact with something beneath the church to protect the town.' },
            { chapter: 'burden', text: 'The church basement contains a sealed portal he maintains with prayer. The secret eats at him.' },
        ],
        knowledge: [
            { topic: 'healing', content: 'I can offer minor blessings and tend to wounds. The Ash God provides for those in need.' },
            { topic: 'undead', content: 'Undead are drawn to places where the veil is thin. Holy water and silver can repel lesser ones.' },
            { topic: 'purification', content: 'Cursed items can be purified at the altar, but the ritual requires rare components and faith.' },
            { topic: 'basement', content: 'The basement is... for storage. Nothing more. Please do not go down there.' },
            { topic: 'artifacts', content: 'Sacred relics of the Ash God are scattered across the land. Each holds power against darkness.' },
        ],
        memory: [],
        metadata: {
            appearance: 'Tall, gaunt man in ashen robes. Silver hair pulled back. Hands tremble slightly when idle. A heavy iron holy symbol hangs from his neck.',
            voice: 'soft, deliberate',
            greeting: 'Peace be upon you, traveler. How may the Ash God\'s servant help?',
        },
    },

    // ── WIZARD SHOP ─────────────────────────────────────────────────
    {
        id: '10000000-0000-4000-a000-000000000005',
        name: 'Aelindra',
        title: 'Arcane Merchant',
        location_id: LOC_WIZARD_SHOP,
        tile_x: 7,
        tile_y: 7,
        sprite_color: '#4169e1',
        traits: {
            arrogant: true,
            brilliant: true,
            transactional: true,
            elven: true,
            exiled: true,
        },
        backstory: [
            { chapter: 'origin', text: 'An elven sorceress exiled from her homeland for "unapproved experiments."' },
            { chapter: 'emporium', text: 'Opened the Arcane Emporium to fund her research into the veil between worlds.' },
            { chapter: 'ritual', text: 'Her midnight chanting is part of a long-term ritual. She considers mortals amusing diversions.' },
        ],
        knowledge: [
            { topic: 'items', content: 'I deal in enchanted goods. Scrolls, potions, wands — all priced fairly for their power.' },
            { topic: 'identification', content: 'I can identify unknown magical items for a fee. Bring them here and I will divine their nature.' },
            { topic: 'crypts_history', content: 'The Hollow Crypts were built by Mage-King Vorath three centuries ago. His phylactery may still be intact.' },
            { topic: 'ingredients', content: 'Whisper Glade contains rare moonpetals and shadowmoss. Essential for high-level enchantments.' },
            { topic: 'veil', content: 'The barrier between worlds grows thin. I study it — for academic purposes, naturally.' },
        ],
        memory: [],
        metadata: {
            appearance: 'Tall elf with sharp features and pale violet eyes. Dark blue robes covered in silver runes. Arcane energy crackles around her fingertips.',
            voice: 'melodic, condescending',
            greeting: 'Hmm. You look like you can barely afford to breathe, let alone shop here.',
        },
    },

    // ── CASTLE GATE ─────────────────────────────────────────────────
    {
        id: '10000000-0000-4000-a000-000000000006',
        name: 'Sergeant Bryn',
        title: 'Gate Captain',
        location_id: LOC_CASTLE_GATE,
        tile_x: 10,
        tile_y: 5,
        sprite_color: '#b8860b',
        traits: {
            stern: true,
            honorable: true,
            battleHardened: true,
            respectsWarriors: true,
        },
        backstory: [
            { chapter: 'origin', text: 'Veteran of three sieges and countless skirmishes.' },
            { chapter: 'loss', text: 'Lost half her squad to the creatures from the Hollow Crypts. Keeps the gate sealed after dark.' },
            { chapter: 'duty', text: 'Only opens the gate for armed parties willing to sign a death-waiver.' },
        ],
        knowledge: [
            { topic: 'beyond_gate', content: 'Past this gate lies nothing but death. The Crypts are infested with undead and worse.' },
            { topic: 'crypts_layout', content: 'The first level is corridors and antechambers. Skeletons patrol in groups of three. The second level... nobody has come back from there.' },
            { topic: 'tactics', content: 'Keep your backs to the wall. Never split up. If you hear whispering, run.' },
            { topic: 'party_assessment', content: 'Show me your weapons and I will tell you if you are ready. Most are not.' },
            { topic: 'safe_path', content: 'Hug the left wall from the entrance. It will take you to the first treasure room without encountering the bone guardian.' },
        ],
        memory: [],
        metadata: {
            appearance: 'Broad, scarred woman in heavy plate armor. Missing two fingers on her left hand. A massive two-handed sword strapped to her back.',
            voice: 'commanding, clipped',
            greeting: 'State your purpose, or turn around. I don\'t have time for tourists.',
        },
    },
];
