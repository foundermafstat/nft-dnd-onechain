-- NPCs table with extensible JSONB fields for dynamic AI memory
CREATE TABLE IF NOT EXISTS public.npcs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    title text,
    location_id uuid NOT NULL REFERENCES public.locations(id),
    tile_x integer NOT NULL DEFAULT 0,
    tile_y integer NOT NULL DEFAULT 0,
    sprite_color text DEFAULT '#a0522d',

    -- Extensible JSONB fields: add/update entries without schema changes
    -- Example: {"gruff": true, "secretlyKind": true, "fears": ["fire", "betrayal"]}
    traits jsonb DEFAULT '{}'::jsonb,

    -- Narrative backstory entries — append new chapters over time
    -- Example: [{"chapter": "origin", "text": "..."}, {"chapter": "siege", "text": "..."}]
    backstory jsonb DEFAULT '[]'::jsonb,

    -- Dynamic knowledge base — system can inject new entries at runtime
    -- Example: [{"topic": "rumors", "content": "..."}, {"topic": "quests", "content": "..."}]
    knowledge jsonb DEFAULT '[]'::jsonb,

    -- Live memory of player interactions — AI updates after each conversation
    -- Example: [{"player_id": "...", "summary": "asked about dungeon", "timestamp": "..."}]
    memory jsonb DEFAULT '[]'::jsonb,

    -- Visual/dialogue metadata
    -- Example: {"appearance": "...", "voice": "deep", "greeting": "What'll it be?"}
    metadata jsonb DEFAULT '{}'::jsonb,

    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage npcs"
    ON public.npcs FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_npcs_location ON public.npcs(location_id);
