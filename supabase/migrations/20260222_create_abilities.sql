-- Abilities system: skills, talents, spells, ancestry/class features
-- Flexible JSONB model that can represent any ability type and be extended by AI generation

CREATE TABLE IF NOT EXISTS public.abilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name text NOT NULL,
    slug text NOT NULL UNIQUE,                -- 'turn_undead', 'backstab', 'magic_missile'
    description text NOT NULL,

    -- Classification
    ability_type text NOT NULL,               -- 'ancestry_feature', 'class_feature', 'talent', 'spell', 'skill', 'passive'
    tier integer DEFAULT 1,                   -- Spell tier (1-5), talent level, or feature tier

    -- Restrictions: who can learn/use this ability
    class_restriction text[],                 -- {'Fighter','Priest'} or empty = all
    ancestry_restriction text[],              -- {'Elf','Dwarf'} or empty = all
    level_requirement integer DEFAULT 1,      -- Minimum character level

    -- Stat dependency
    primary_stat text,                        -- 'STR','DEX','CON','INT','WIS','CHA'

    -- Mechanics (JSONB for full flexibility)
    -- Spells:   {"range":"Near","duration":"focus","damage":"2d6","save":"DEX","school":"Evocation"}
    -- Talents:  {"bonus":"+1","target":"melee_attack","stacks":true}
    -- Features: {"advantage_on":"stealth","condition":"in_shadows"}
    -- Skills:   {"check_type":"STR","dc_default":12,"advantage_if":"background_match"}
    mechanics jsonb DEFAULT '{}'::jsonb,

    -- Usage limits
    -- {"per":"rest","charges":1} or {"per":"always"} or {"per":"encounter","charges":3}
    usage jsonb DEFAULT '{"per":"always"}'::jsonb,

    -- Source: is this from rules or AI-generated?
    source text DEFAULT 'shadowdark',         -- 'shadowdark', 'ai_generated', 'quest_reward'
    is_template boolean DEFAULT true,

    -- Extensible metadata
    metadata jsonb DEFAULT '{}'::jsonb,

    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage abilities"
    ON public.abilities FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_abilities_type ON public.abilities(ability_type);
CREATE INDEX idx_abilities_class ON public.abilities USING GIN(class_restriction);
CREATE INDEX idx_abilities_ancestry ON public.abilities USING GIN(ancestry_restriction);

-- Character's learned/acquired abilities
CREATE TABLE IF NOT EXISTS public.character_abilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    ability_id uuid NOT NULL REFERENCES public.abilities(id),
    is_active boolean DEFAULT true,           -- Can the character currently use this?
    charges_remaining integer,                -- For limited-use abilities
    source text DEFAULT 'level_up',           -- 'level_up', 'scroll', 'quest_reward', 'training', 'innate'
    acquired_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,       -- Custom overrides, mastery level etc.
    UNIQUE(character_id, ability_id)
);

ALTER TABLE public.character_abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage character_abilities"
    ON public.character_abilities FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_char_abilities_character ON public.character_abilities(character_id);
