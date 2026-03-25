-- Migration for NFT-DND Game State
-- Description: Creates the players table for Freighter wallet authentication

CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    nickname TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated backend service
CREATE POLICY "Enable read access for service role"
ON public.players FOR SELECT
USING (true);

-- Allow insert/update access for backend service
CREATE POLICY "Enable insert/update for service role"
ON public.players FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_wallet ON public.players(wallet_address);
