-- Expanded items system based on Shadowdark RPG rules
-- Replaces the original basic items table with a comprehensive item model

-- Drop old items table if it exists (it was basic and unused)
DROP TABLE IF EXISTS public.items CASCADE;

CREATE TABLE public.items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name text NOT NULL,
    base_type text NOT NULL,             -- 'Longsword', 'Chainmail', 'Torch', 'Scroll of Light'
    category text NOT NULL,              -- 'Weapon', 'Armor', 'Gear', 'Magic', 'Scroll', 'Wand', 'QuestItem'
    subcategory text,                    -- 'Melee', 'Ranged', 'Light', 'Medium', 'Heavy', 'Shield', 'Tool', 'Consumable'

    -- Rarity & blockchain
    rarity text NOT NULL DEFAULT 'Common',  -- Common, Uncommon, Rare, Epic, Legendary
    is_nft boolean DEFAULT false,
    blockchain_status text DEFAULT 'OFF_CHAIN',  -- OFF_CHAIN, MINTABLE, MINTED
    onechain_token_id text,               -- OneChain NFT token ID when minted

    -- Cost & weight
    cost_gp integer DEFAULT 0,           -- Price in gold pieces
    slots integer DEFAULT 1,             -- Inventory slots occupied

    -- Combat stats (JSONB for flexibility)
    -- Weapons: {"damage": "1d8", "range": "Close", "properties": ["Versatile", "Finesse"]}
    -- Armor: {"ac_base": 13, "ac_dex": true, "penalties": ["stealth", "swimming"]}
    -- Gear: {"duration_seconds": 3600, "light_range": "Near"}
    -- Magic: {"spell": "Light", "charges": 1, "break_on_nat1": false}
    stats jsonb DEFAULT '{}'::jsonb,

    -- Rarity bonuses (applied on top of base stats)
    -- {"attack_bonus": 2, "damage_bonus": 2, "ac_bonus": 1}
    bonuses jsonb DEFAULT '{}'::jsonb,

    -- Special abilities / perks (AI-generated for Rare+)
    -- ["Smite: +1d6 radiant damage vs Undead", "Glows faintly near traps"]
    perks jsonb DEFAULT '[]'::jsonb,

    -- AI-generated lore text (for Rare+ items)
    lore text,

    -- Class restrictions (empty = all classes)
    -- ["Fighter", "Thief"]
    class_restrictions jsonb DEFAULT '[]'::jsonb,

    -- Is this a template item (seed) or a player instance?
    is_template boolean DEFAULT true,
    parent_template_id uuid REFERENCES public.items(id),

    -- Metadata for extensibility
    metadata jsonb DEFAULT '{}'::jsonb,

    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage items"
    ON public.items FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_rarity ON public.items(rarity);
CREATE INDEX idx_items_template ON public.items(is_template);

-- Character inventory: links characters to item instances
CREATE TABLE public.character_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id),
    quantity integer DEFAULT 1,
    is_equipped boolean DEFAULT false,
    slot_position text,  -- 'main_hand', 'off_hand', 'armor', 'talisman_1', 'talisman_2', 'backpack'
    acquired_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.character_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage character_inventory"
    ON public.character_inventory FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_char_inventory_character ON public.character_inventory(character_id);
CREATE INDEX idx_char_inventory_item ON public.character_inventory(item_id);
