-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  name text NOT NULL,
  ancestry text NOT NULL,
  class text NOT NULL,
  level integer DEFAULT 1,
  xp integer DEFAULT 0,
  background text,
  alignment text,
  stats_str integer NOT NULL,
  stats_dex integer NOT NULL,
  stats_con integer NOT NULL,
  stats_int integer NOT NULL,
  stats_wis integer NOT NULL,
  stats_cha integer NOT NULL,
  hp_current integer NOT NULL,
  hp_max integer NOT NULL,
  ac integer NOT NULL,
  state jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT characters_pkey PRIMARY KEY (id),
  CONSTRAINT characters_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  rarity text NOT NULL,
  is_nft boolean DEFAULT false,
  attributes jsonb DEFAULT '{}'::jsonb,
  ai_history text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  biome_type text NOT NULL,
  room_type text NOT NULL,
  threat_level integer DEFAULT 1,
  coordinates jsonb DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.player_positions (
  player_id uuid NOT NULL,
  location_id uuid NOT NULL,
  tile_x integer NOT NULL DEFAULT 0,
  tile_y integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT player_positions_pkey PRIMARY KEY (player_id),
  CONSTRAINT player_positions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id),
  CONSTRAINT player_positions_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  nickname text,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT players_pkey PRIMARY KEY (id)
);
CREATE TABLE public.quest_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL,
  location_id uuid,
  player_action text,
  player_background text,
  player_roll integer,
  dm_roll integer,
  ai_narrative text,
  engine_trigger text,
  on_chain_event boolean DEFAULT false,
  movement_vector jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quest_history_pkey PRIMARY KEY (id),
  CONSTRAINT quest_history_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id),
  CONSTRAINT quest_history_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  party_members jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'InProgress'::text,
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  loot_dropped boolean DEFAULT false,
  stat_changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quests_pkey PRIMARY KEY (id)
);