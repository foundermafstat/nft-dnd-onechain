-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.abilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  ability_type text NOT NULL,
  tier integer DEFAULT 1,
  class_restriction ARRAY,
  ancestry_restriction ARRAY,
  level_requirement integer DEFAULT 1,
  primary_stat text,
  mechanics jsonb DEFAULT '{}'::jsonb,
  usage jsonb DEFAULT '{"per": "always"}'::jsonb,
  source text DEFAULT 'shadowdark'::text,
  is_template boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT abilities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.campaign_chronicles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  location_id uuid,
  quest_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['COMBAT_VICTORY'::text, 'PUZZLE_SOLVED'::text, 'NPC_INTERACTION'::text, 'STORY_MILESTONE'::text, 'TRAP_TRIGGERED'::text])),
  narrative text NOT NULL,
  on_chain_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT campaign_chronicles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.character_abilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  ability_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  charges_remaining integer,
  source text DEFAULT 'level_up'::text,
  acquired_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT character_abilities_pkey PRIMARY KEY (id),
  CONSTRAINT character_abilities_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id),
  CONSTRAINT character_abilities_ability_id_fkey FOREIGN KEY (ability_id) REFERENCES public.abilities(id)
);
CREATE TABLE public.character_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer DEFAULT 1,
  is_equipped boolean DEFAULT false,
  slot_position text,
  acquired_at timestamp with time zone DEFAULT now(),
  CONSTRAINT character_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT character_inventory_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id),
  CONSTRAINT character_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id)
);
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
CREATE TABLE public.combat_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  combat_id uuid NOT NULL,
  entity_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['PLAYER'::text, 'MOB'::text])),
  character_id uuid,
  initiative integer NOT NULL DEFAULT 0,
  is_alive boolean NOT NULL DEFAULT true,
  CONSTRAINT combat_participants_pkey PRIMARY KEY (id),
  CONSTRAINT combat_participants_combat_id_fkey FOREIGN KEY (combat_id) REFERENCES public.combats(id)
);
CREATE TABLE public.combats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'INITIATIVE'::text CHECK (status = ANY (ARRAY['INITIATIVE'::text, 'IN_PROGRESS'::text, 'VICTORY'::text, 'DEFEAT'::text])),
  round integer NOT NULL DEFAULT 1,
  turn_queue jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_turn_index integer NOT NULL DEFAULT 0,
  active_entity_id text,
  entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  CONSTRAINT combats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fate_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  combat_id uuid NOT NULL,
  entity_id text NOT NULL,
  current_index integer NOT NULL DEFAULT 0,
  pool_values ARRAY NOT NULL DEFAULT '{}'::integer[],
  merkle_root text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fate_pools_pkey PRIMARY KEY (id),
  CONSTRAINT fate_pools_combat_id_fkey FOREIGN KEY (combat_id) REFERENCES public.combats(id)
);
CREATE TABLE public.generated_scenarios (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  location_id uuid,
  prompt_context jsonb NOT NULL,
  llm_output jsonb NOT NULL,
  applied boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT generated_scenarios_pkey PRIMARY KEY (id),
  CONSTRAINT generated_scenarios_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_type text NOT NULL,
  category text NOT NULL,
  subcategory text,
  rarity text NOT NULL DEFAULT 'Common'::text,
  is_nft boolean DEFAULT false,
  blockchain_status text DEFAULT 'OFF_CHAIN'::text,
  onechain_token_id text,
  cost_gp integer DEFAULT 0,
  slots integer DEFAULT 1,
  stats jsonb DEFAULT '{}'::jsonb,
  bonuses jsonb DEFAULT '{}'::jsonb,
  perks jsonb DEFAULT '[]'::jsonb,
  lore text,
  class_restrictions jsonb DEFAULT '[]'::jsonb,
  is_template boolean DEFAULT true,
  parent_template_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT items_pkey PRIMARY KEY (id),
  CONSTRAINT items_parent_template_id_fkey FOREIGN KEY (parent_template_id) REFERENCES public.items(id)
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
CREATE TABLE public.npcs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  location_id uuid NOT NULL,
  tile_x integer NOT NULL DEFAULT 0,
  tile_y integer NOT NULL DEFAULT 0,
  sprite_color text DEFAULT '#a0522d'::text,
  traits jsonb DEFAULT '{}'::jsonb,
  backstory jsonb DEFAULT '[]'::jsonb,
  knowledge jsonb DEFAULT '[]'::jsonb,
  memory jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT npcs_pkey PRIMARY KEY (id),
  CONSTRAINT npcs_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
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