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
          role: 'admin' | 'player' | 'facilitator'
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
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'player' | 'facilitator'
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
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'player' | 'facilitator'
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
          required_level: SkillLevel | null
          status: 'open' | 'full' | 'cancelled' | 'completed'
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
          required_level?: SkillLevel | null
          status?: 'open' | 'full' | 'cancelled' | 'completed'
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
          required_level?: SkillLevel | null
          status?: 'open' | 'full' | 'cancelled' | 'completed'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      registrations: {
        Row: {
          id: string
          schedule_id: string
          registered_by: string
          player_id: string
          team_preference: 'shuffle' | 'teammate'
          payment_status: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url: string | null
          attended: boolean
          qr_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          registered_by: string
          player_id: string
          team_preference?: 'shuffle' | 'teammate'
          payment_status?: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url?: string | null
          attended?: boolean
          qr_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          registered_by?: string
          player_id?: string
          team_preference?: 'shuffle' | 'teammate'
          payment_status?: 'pending' | 'review' | 'paid' | 'rejected'
          payment_proof_url?: string | null
          attended?: boolean
          qr_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          schedule_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          name?: string
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          player_id: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
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
          role?: 'admin' | 'player' | 'facilitator'
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
      user_role: 'admin' | 'player' | 'facilitator'
      skill_level: SkillLevel
      schedule_status: 'open' | 'full' | 'cancelled' | 'completed'
      payment_status: 'pending' | 'review' | 'paid' | 'rejected'
      team_preference: 'shuffle' | 'teammate'
    }
  }
}

export type SkillLevel =
  | 'developmental'
  | 'developmental_plus'
  | 'intermediate'
  | 'intermediate_plus'
  | 'advanced'
