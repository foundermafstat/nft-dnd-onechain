-- Player position tracking for realtime location sync
CREATE TABLE IF NOT EXISTS public.player_positions (
    player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES public.locations(id),
    tile_x integer NOT NULL DEFAULT 0,
    tile_y integer NOT NULL DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.player_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage player_positions"
    ON public.player_positions FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_player_positions_location ON public.player_positions(location_id);
