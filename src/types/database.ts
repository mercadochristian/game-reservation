export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          role: 'admin' | 'player' | 'facilitator' | 'super_admin'
          skill_level: SkillLevel | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          birthday_month: number | null
          birthday_day: number | null
          birthday_year: number | null
          gender: string | null
          emergency_contact_name: string | null
          emergency_contact_relationship: string | null
          emergency_contact_number: string | null
          player_contact_number: string | null
          profile_completed: boolean
          is_guest: boolean
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'player' | 'facilitator' | 'super_admin'
          skill_level?: SkillLevel | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          birthday_month?: number | null
          birthday_day?: number | null
          birthday_year?: number | null
          gender?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_number?: string | null
          player_contact_number?: string | null
          profile_completed?: boolean
          is_guest?: boolean
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'player' | 'facilitator' | 'super_admin'
          skill_level?: SkillLevel | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          birthday_month?: number | null
          birthday_day?: number | null
          birthday_year?: number | null
          gender?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_number?: string | null
          player_contact_number?: string | null
          profile_completed?: boolean
          is_guest?: boolean
        }
      }
      schedules: {
        Row: {
          id: string
          title: string
          start_time: string
          end_time: string
          location_id: string
          max_players: number
          num_teams: number
          required_levels: SkillLevel[]
          status: 'open' | 'full' | 'cancelled' | 'completed'
          created_by: string
          created_at: string
          updated_at: string
          position_prices: Json
          team_price: number | null
        }
        Insert: {
          id?: string
          title: string
          start_time: string
          end_time: string
          location_id: string
          max_players: number
          num_teams: number
          required_levels?: SkillLevel[]
          status?: 'open' | 'full' | 'cancelled' | 'completed'
          created_by: string
          created_at?: string
          updated_at?: string
          position_prices?: Json
          team_price?: number | null
        }
        Update: {
          id?: string
          title?: string
          start_time?: string
          end_time?: string
          location_id?: string
          max_players?: number
          num_teams?: number
          required_levels?: SkillLevel[]
          status?: 'open' | 'full' | 'cancelled' | 'completed'
          created_by?: string
          created_at?: string
          updated_at?: string
          position_prices?: Json
          team_price?: number | null
        }
      }
      registrations: {
        Row: {
          id: string
          schedule_id: string
          registered_by: string
          player_id: string
          team_preference: 'shuffle' | 'teammate'
          attended: boolean
          qr_token: string | null
          preferred_position: PlayerPosition | null
          lineup_team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          registered_by: string
          player_id: string
          team_preference?: 'shuffle' | 'teammate'
          attended?: boolean
          qr_token?: string | null
          preferred_position?: PlayerPosition | null
          lineup_team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          registered_by?: string
          player_id?: string
          team_preference?: 'shuffle' | 'teammate'
          attended?: boolean
          qr_token?: string | null
          preferred_position?: PlayerPosition | null
          lineup_team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          schedule_id: string
          name: string
          team_type: 'registration' | 'lineup'
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          name: string
          team_type?: 'registration' | 'lineup'
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          name?: string
          team_type?: 'registration' | 'lineup'
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          player_id: string
          position: PlayerPosition | null
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          position?: PlayerPosition | null
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          position?: PlayerPosition | null
        }
      }
      mvp_awards: {
        Row: {
          id: string
          schedule_id: string
          player_id: string
          awarded_by: string
          note: string | null
          awarded_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          player_id: string
          awarded_by: string
          note?: string | null
          awarded_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          player_id?: string
          awarded_by?: string
          note?: string | null
          awarded_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          name: string
          address: string | null
          google_map_url: string | null
          notes: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          google_map_url?: string | null
          notes?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          google_map_url?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      payment_channels: {
        Row: {
          id: string
          name: string
          provider: string
          account_number: string
          account_holder_name: string
          qr_code_url: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          provider: string
          account_number: string
          account_holder_name: string
          qr_code_url?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          provider?: string
          account_number?: string
          account_holder_name?: string
          qr_code_url?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      registration_payments: {
        Row: {
          id: string
          registration_id: string | null
          team_id: string | null
          payer_id: string
          schedule_id: string
          registration_type: 'solo' | 'group' | 'team'
          required_amount: number
          payment_status: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url: string | null
          payment_channel_id: string | null
          extracted_amount: number | null
          extracted_reference: string | null
          extracted_datetime: string | null
          extracted_sender: string | null
          extraction_confidence: 'high' | 'medium' | 'low' | 'failed' | null
          extracted_raw: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          registration_id?: string | null
          team_id?: string | null
          payer_id: string
          schedule_id: string
          registration_type: 'solo' | 'group' | 'team'
          required_amount?: number
          payment_status?: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url?: string | null
          payment_channel_id?: string | null
          extracted_amount?: number | null
          extracted_reference?: string | null
          extracted_datetime?: string | null
          extracted_sender?: string | null
          extraction_confidence?: 'high' | 'medium' | 'low' | 'failed' | null
          extracted_raw?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          registration_id?: string | null
          team_id?: string | null
          payer_id?: string
          schedule_id?: string
          registration_type?: 'solo' | 'group' | 'team'
          required_amount?: number
          payment_status?: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url?: string | null
          payment_channel_id?: string | null
          extracted_amount?: number | null
          extracted_reference?: string | null
          extracted_datetime?: string | null
          extracted_sender?: string | null
          extraction_confidence?: 'high' | 'medium' | 'low' | 'failed' | null
          extracted_raw?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      role_whitelist: {
        Row: {
          email: string
          role: 'admin' | 'player' | 'facilitator'
        }
        Insert: {
          email: string
          role: 'admin' | 'player' | 'facilitator'
        }
        Update: {
          email?: string
          role?: 'admin' | 'player' | 'facilitator' | 'super_admin'
        }
      }
      logs: {
        Row: {
          id: string
          level: 'info' | 'warn' | 'error'
          action: string
          user_id: string | null
          message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          level: 'info' | 'warn' | 'error'
          action: string
          user_id?: string | null
          message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          level?: 'info' | 'warn' | 'error'
          action?: string
          user_id?: string | null
          message?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
    Enums: {
      user_role: 'super_admin' | 'admin' | 'player' | 'facilitator'
      skill_level: SkillLevel
      schedule_status: 'open' | 'full' | 'cancelled' | 'completed'
      payment_status: 'pending' | 'review' | 'paid' | 'rejected'
      registration_type: 'solo' | 'group' | 'team'
      team_preference: 'shuffle' | 'teammate'
      player_position: PlayerPosition
    }
  }
}

export type SkillLevel =
  | 'developmental'
  | 'developmental_plus'
  | 'intermediate'
  | 'intermediate_plus'
  | 'advanced'

export type PlayerPosition =
  | 'open_spiker'
  | 'opposite_spiker'
  | 'middle_blocker'
  | 'setter'
