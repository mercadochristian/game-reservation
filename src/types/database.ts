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
        Relationships: []
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
        Relationships: []
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
          required_levels: string[]
          status: 'open' | 'full' | 'cancelled' | 'completed'
          position_prices: Json | null
          team_price: number | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          start_time: string
          end_time: string
          location_id: string
          max_players: number
          num_teams?: number
          required_levels?: string[]
          status?: 'open' | 'full' | 'cancelled' | 'completed'
          position_prices?: Json | null
          team_price?: number | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          start_time?: string
          end_time?: string
          location_id?: string
          max_players?: number
          num_teams?: number
          required_levels?: string[]
          status?: 'open' | 'full' | 'cancelled' | 'completed'
          position_prices?: Json | null
          team_price?: number | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          id: string
          schedule_id: string
          registered_by: string
          player_id: string
          team_preference: 'shuffle' | 'group' | 'team'
          payment_status: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url: string | null
          attended: boolean
          qr_token: string | null
          preferred_position: PlayerPosition | null
          lineup_team_id: string | null
          payment_channel_id: string | null
          extracted_amount: number | null
          extracted_reference: string | null
          extracted_datetime: string | null
          extracted_sender: string | null
          extraction_confidence: string | null
          extracted_raw: Json | null
          registration_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          registered_by: string
          player_id: string
          team_preference?: 'shuffle' | 'group' | 'team'
          payment_status?: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url?: string | null
          attended?: boolean
          qr_token?: string | null
          preferred_position?: PlayerPosition | null
          lineup_team_id?: string | null
          payment_channel_id?: string | null
          extracted_amount?: number | null
          extracted_reference?: string | null
          extracted_datetime?: string | null
          extracted_sender?: string | null
          extraction_confidence?: string | null
          extracted_raw?: Json | null
          registration_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          registered_by?: string
          player_id?: string
          team_preference?: 'shuffle' | 'group' | 'team'
          payment_status?: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url?: string | null
          attended?: boolean
          qr_token?: string | null
          preferred_position?: PlayerPosition | null
          lineup_team_id?: string | null
          payment_channel_id?: string | null
          extracted_amount?: number | null
          extracted_reference?: string | null
          extracted_datetime?: string | null
          extracted_sender?: string | null
          extraction_confidence?: string | null
          extracted_raw?: Json | null
          registration_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          schedule_id: string
          name: string
          team_type: string
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          name: string
          team_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          name?: string
          team_type?: string
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          player_id: string
          position: PlayerPosition | null
          registration_id: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          position?: PlayerPosition | null
          registration_id: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          position?: PlayerPosition | null
          registration_id?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      registration_payments: {
        Row: {
          id: string
          registration_id: string | null
          team_id: string | null
          payer_id: string
          schedule_id: string
          registration_type: string
          required_amount: number
          payment_status: string
          payment_proof_url: string | null
          payment_channel_id: string | null
          extracted_amount: number | null
          extracted_reference: string | null
          extracted_datetime: string | null
          extracted_sender: string | null
          extraction_confidence: string | null
          extracted_raw: Json | null
          payment_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          registration_id?: string | null
          team_id?: string | null
          payer_id: string
          schedule_id: string
          registration_type: string
          required_amount?: number
          payment_status?: string
          payment_proof_url?: string | null
          payment_channel_id?: string | null
          extracted_amount?: number | null
          extracted_reference?: string | null
          extracted_datetime?: string | null
          extracted_sender?: string | null
          extraction_confidence?: string | null
          extracted_raw?: Json | null
          payment_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          registration_id?: string | null
          team_id?: string | null
          payer_id?: string
          schedule_id?: string
          registration_type?: string
          required_amount?: number
          payment_status?: string
          payment_proof_url?: string | null
          payment_channel_id?: string | null
          extracted_amount?: number | null
          extracted_reference?: string | null
          extracted_datetime?: string | null
          extracted_sender?: string | null
          extraction_confidence?: string | null
          extracted_raw?: Json | null
          payment_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_whitelist: {
        Row: {
          email: string
          role: 'admin' | 'player' | 'facilitator' | 'super_admin'
        }
        Insert: {
          email: string
          role: 'admin' | 'player' | 'facilitator' | 'super_admin'
        }
        Update: {
          email?: string
          role?: 'admin' | 'player' | 'facilitator' | 'super_admin'
        }
        Relationships: []
      }
      logs: {
        Row: {
          id: string
          level: string
          action: string
          user_id: string | null
          message: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          level: string
          action: string
          user_id?: string | null
          message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          level?: string
          action?: string
          user_id?: string | null
          message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      user_role: 'admin' | 'player' | 'facilitator' | 'super_admin'
      skill_level: SkillLevel
      schedule_status: 'open' | 'full' | 'cancelled' | 'completed'
      payment_status: 'pending' | 'review' | 'paid' | 'rejected'
      team_preference: 'shuffle' | 'group' | 'team'
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
  | 'setter'
  | 'open_spiker'
  | 'opposite_spiker'
  | 'middle_blocker'
