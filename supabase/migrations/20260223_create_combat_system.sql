-- Combat System Tables
-- Run this migration in your Supabase SQL Editor

-- 1. Active/completed combat sessions
CREATE TABLE IF NOT EXISTS combats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'INITIATIVE' CHECK (status IN ('INITIATIVE', 'IN_PROGRESS', 'VICTORY', 'DEFEAT')),
    round INTEGER NOT NULL DEFAULT 1,
    turn_queue JSONB NOT NULL DEFAULT '[]',       -- Ordered entity IDs
    current_turn_index INTEGER NOT NULL DEFAULT 0,
    active_entity_id TEXT,
    entities JSONB NOT NULL DEFAULT '{}',          -- Record<string, CombatEntity>
    logs JSONB NOT NULL DEFAULT '[]',              -- CombatLog[]
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- 2. Maps characters/mobs to a combat (for querying)
CREATE TABLE IF NOT EXISTS combat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combat_id UUID NOT NULL REFERENCES combats(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('PLAYER', 'MOB')),
    character_id UUID,           -- FK to characters table (players only)
    initiative INTEGER NOT NULL DEFAULT 0,
    is_alive BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_combat_participants_combat ON combat_participants(combat_id);
CREATE INDEX IF NOT EXISTS idx_combat_participants_character ON combat_participants(character_id);

-- 3. Pre-generated dice pools for ZK verification
CREATE TABLE IF NOT EXISTS fate_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combat_id UUID NOT NULL REFERENCES combats(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL,
    current_index INTEGER NOT NULL DEFAULT 0,
    pool_values INTEGER[] NOT NULL DEFAULT '{}',   -- Pre-generated random values (1-100)
    merkle_root TEXT,                               -- For future ZK verification on Stellar
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fate_pools_combat ON fate_pools(combat_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fate_pools_entity ON fate_pools(combat_id, entity_id);
