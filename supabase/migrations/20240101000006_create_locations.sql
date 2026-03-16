-- Table
CREATE TABLE public.locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT,
  google_map_url  TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_is_active ON public.locations (is_active);

-- RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read locations
CREATE POLICY "locations_select_public"
  ON public.locations FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "locations_insert_admin"
  ON public.locations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can update
CREATE POLICY "locations_update_admin"
  ON public.locations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete
CREATE POLICY "locations_delete_admin"
  ON public.locations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
