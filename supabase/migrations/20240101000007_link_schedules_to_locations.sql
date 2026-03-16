-- Drop the old free-text venue column
ALTER TABLE public.schedules DROP COLUMN venue;

-- Add location_id FK
ALTER TABLE public.schedules
  ADD COLUMN location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT;

-- Index for joins
CREATE INDEX idx_schedules_location_id ON public.schedules (location_id);
