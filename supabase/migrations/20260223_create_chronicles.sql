-- Create the campaign_chronicles table to store narrative branching events
-- and key decisions made by players. These are hashed on-chain.
CREATE TABLE IF NOT EXISTS public.campaign_chronicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NULL,
    location_id UUID NULL,
    quest_id UUID NULL,
    
    event_type TEXT NOT NULL CHECK (event_type IN ('COMBAT_VICTORY', 'PUZZLE_SOLVED', 'NPC_INTERACTION', 'STORY_MILESTONE', 'TRAP_TRIGGERED')),
    narrative TEXT NOT NULL,
    on_chain_hash TEXT NULL, -- SHA256 hash sent to OneChain adventure_vault
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for retrieving recent chronicles efficiently
CREATE INDEX IF NOT EXISTS idx_chronicles_created_at ON public.campaign_chronicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chronicles_session ON public.campaign_chronicles(session_id);

-- Create a table to store full generated scenarios for audit/replay
CREATE TABLE IF NOT EXISTS public.generated_scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id UUID NULL REFERENCES public.locations(id) ON DELETE SET NULL,
    prompt_context JSONB NOT NULL,    -- The PartyContext sent to the LLM
    llm_output JSONB NOT NULL,        -- The GeneratedScenario JSON returned by LLM
    applied BOOLEAN DEFAULT false,    -- Whether it was successfully instantiated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - though assuming backend manages these
ALTER TABLE public.campaign_chronicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_scenarios ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (or service role) to read/write for now
-- Assuming backend connects with service role prioritizing logic
CREATE POLICY "Enable all access for service role" ON public.campaign_chronicles FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON public.generated_scenarios FOR ALL USING (true);
