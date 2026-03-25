-- Migration for NFT-DND Game State
-- Description: Creates the characters table to store heroes linked to players

CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ancestry TEXT NOT NULL,
    class TEXT NOT NULL,
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    background TEXT,
    alignment TEXT,
    stats_str INT NOT NULL,
    stats_dex INT NOT NULL,
    stats_con INT NOT NULL,
    stats_int INT NOT NULL,
    stats_wis INT NOT NULL,
    stats_cha INT NOT NULL,
    hp_current INT NOT NULL,
    hp_max INT NOT NULL,
    ac INT NOT NULL,
    state JSONB DEFAULT '{}'::jsonb, -- stores inventory, effects, languages
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: A player might have multiple characters eventually. 
-- Right now, we'll just allow multiple, or restrict in backend logic.

-- Enable Row Level Security
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated backend service
CREATE POLICY "Enable read access for service role"
ON public.characters FOR SELECT
USING (true);

-- Allow insert/update access for backend service
CREATE POLICY "Enable insert/update for service role"
ON public.characters FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_player_id ON public.characters(player_id);
