/**
 * Shadowdark Player Quickstart (Digital PDF) — additional Common items
 * that were missing from the existing template catalog.
 *
 * Source pages: 33-35 (basic gear, armor, weapons tables).
 */

interface QuickstartItemSeed {
    id: string;
    name: string;
    base_type: string;
    category: string;
    subcategory?: string;
    rarity: string;
    cost_gp: number;
    slots: number;
    stats: Record<string, any>;
    bonuses: Record<string, any>;
    perks: any[];
    class_restrictions: string[];
    is_template: boolean;
    metadata?: Record<string, any>;
}

export const QUICKSTART_COMMON_ITEM_SEEDS: QuickstartItemSeed[] = [
    {
        id: '21000000-0000-4000-a000-000000000001',
        name: 'Flask or Bottle',
        base_type: 'Flask or Bottle',
        category: 'Gear',
        subcategory: 'Container',
        rarity: 'Common',
        cost_gp: 0.3,
        slots: 1,
        stats: { description: 'Glass container that holds one draught of liquid.', source_cost: '3 sp' },
        bonuses: {},
        perks: [],
        class_restrictions: [],
        is_template: true,
        metadata: { source: 'shadowdark_quickstart_pdf' },
    },
    {
        id: '21000000-0000-4000-a000-000000000002',
        name: 'Mirror',
        base_type: 'Mirror',
        category: 'Gear',
        subcategory: 'Tool',
        rarity: 'Common',
        cost_gp: 10,
        slots: 1,
        stats: { description: 'A small, polished mirror.' },
        bonuses: {},
        perks: [],
        class_restrictions: [],
        is_template: true,
        metadata: { source: 'shadowdark_quickstart_pdf' },
    },
    {
        id: '21000000-0000-4000-a000-000000000003',
        name: 'Coin',
        base_type: 'Coin',
        category: 'Gear',
        subcategory: 'Consumable',
        rarity: 'Common',
        cost_gp: 0.5,
        slots: 0,
        stats: { description: 'Currency stack. 100 coins are free to carry.', free_quantity: 100 },
        bonuses: {},
        perks: [],
        class_restrictions: [],
        is_template: true,
        metadata: { source: 'shadowdark_quickstart_pdf' },
    },
    {
        id: '21000000-0000-4000-a000-000000000004',
        name: 'Gem',
        base_type: 'Gem',
        category: 'Gear',
        subcategory: 'Tool',
        rarity: 'Common',
        cost_gp: 0,
        slots: 1,
        stats: { description: 'Valuable gem in numerous varieties.', source_cost: 'Varies' },
        bonuses: {},
        perks: [],
        class_restrictions: [],
        is_template: true,
        metadata: { source: 'shadowdark_quickstart_pdf' },
    },
    {
        id: '21000000-0000-4000-a000-000000000101',
        name: 'Bastard Sword',
        base_type: 'Bastard Sword',
        category: 'Weapon',
        subcategory: 'Melee',
        rarity: 'Common',
        cost_gp: 10,
        slots: 2,
        stats: { damage: '1d8', versatile_damage: '1d10', range: 'Close', properties: ['Versatile'] },
        bonuses: {},
        perks: [],
        class_restrictions: ['Fighter'],
        is_template: true,
        metadata: { source: 'shadowdark_quickstart_pdf' },
    },
    {
        id: '21000000-0000-4000-a000-000000000102',
        name: 'Javelin',
        base_type: 'Javelin',
        category: 'Weapon',
        subcategory: 'Melee',
        rarity: 'Common',
        cost_gp: 0,
        slots: 1,
        stats: { damage: '1d4', range: 'Near', properties: ['Thrown'], source_cost: '5 sp' },
        bonuses: {},
        perks: [],
        class_restrictions: [],
        is_template: true,
        metadata: { source: 'shadowdark_quickstart_pdf' },
    },
];
