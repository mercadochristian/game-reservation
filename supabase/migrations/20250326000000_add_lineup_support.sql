-- Add lineup team support
-- Allows admins/facilitators to organize players into game-day teams separate from registration groups

-- Add type discriminator to distinguish registration groups from lineup teams
ALTER TABLE teams
  ADD COLUMN team_type TEXT NOT NULL DEFAULT 'registration'
  CHECK (team_type IN ('registration', 'lineup'));

-- Track which lineup team each registration is assigned to
ALTER TABLE registrations
  ADD COLUMN lineup_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Indexes for fast lookup
CREATE INDEX idx_registrations_lineup_team_id ON registrations(lineup_team_id);
CREATE INDEX idx_teams_schedule_type ON teams(schedule_id, team_type);
