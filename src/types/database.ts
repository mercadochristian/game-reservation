export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      locations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          google_map_url: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          google_map_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          google_map_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          action: string
          created_at: string
          id: string
          level: string
          message: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          level: string
          message?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          level?: string
          message?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_awards: {
        Row: {
          awarded_at: string
          awarded_by: string
          id: string
          note: string | null
          player_id: string
          schedule_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by: string
          id?: string
          note?: string | null
          player_id: string
          schedule_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string
          id?: string
          note?: string | null
          player_id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mvp_awards_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_awards_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_channels: {
        Row: {
          account_holder_name: string
          account_number: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          provider: string
          qr_code_url: string | null
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          provider: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_payments: {
        Row: {
          created_at: string
          extracted_amount: number | null
          extracted_datetime: string | null
          extracted_raw: Json | null
          extracted_reference: string | null
          extracted_sender: string | null
          extraction_confidence: string | null
          extraction_status: string | null
          id: string
          payer_id: string
          payment_channel_id: string | null
          payment_note: string | null
          payment_proof_url: string | null
          payment_status: string
          registration_id: string | null
          registration_type: string
          required_amount: number
          schedule_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_amount?: number | null
          extracted_datetime?: string | null
          extracted_raw?: Json | null
          extracted_reference?: string | null
          extracted_sender?: string | null
          extraction_confidence?: string | null
          extraction_status?: string | null
          id?: string
          payer_id: string
          payment_channel_id?: string | null
          payment_note?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          registration_id?: string | null
          registration_type: string
          required_amount?: number
          schedule_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_amount?: number | null
          extracted_datetime?: string | null
          extracted_raw?: Json | null
          extracted_reference?: string | null
          extracted_sender?: string | null
          extraction_confidence?: string | null
          extraction_status?: string | null
          id?: string
          payer_id?: string
          payment_channel_id?: string | null
          payment_note?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          registration_id?: string | null
          registration_type?: string
          required_amount?: number
          schedule_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_payments_payment_channel_id_fkey"
            columns: ["payment_channel_id"]
            isOneToOne: false
            referencedRelation: "payment_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_payments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          attended: boolean
          created_at: string
          id: string
          lineup_team_id: string | null
          player_id: string
          preferred_position:
            | Database["public"]["Enums"]["player_position"]
            | null
          qr_token: string | null
          registered_by: string
          registration_note: string | null
          schedule_id: string
          team_preference: Database["public"]["Enums"]["team_preference"]
          updated_at: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          id?: string
          lineup_team_id?: string | null
          player_id: string
          preferred_position?:
            | Database["public"]["Enums"]["player_position"]
            | null
          qr_token?: string | null
          registered_by: string
          registration_note?: string | null
          schedule_id: string
          team_preference?: Database["public"]["Enums"]["team_preference"]
          updated_at?: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          id?: string
          lineup_team_id?: string | null
          player_id?: string
          preferred_position?:
            | Database["public"]["Enums"]["player_position"]
            | null
          qr_token?: string | null
          registered_by?: string
          registration_note?: string | null
          schedule_id?: string
          team_preference?: Database["public"]["Enums"]["team_preference"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_lineup_team_id_fkey"
            columns: ["lineup_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      role_whitelist: {
        Row: {
          email: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          email: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          discount_type: string | null
          discount_value: number | null
          end_time: string
          id: string
          location_id: string
          max_players: number
          num_teams: number
          position_prices: Json
          required_levels: string[] | null
          start_time: string
          status: Database["public"]["Enums"]["schedule_status"]
          team_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_time: string
          id?: string
          location_id: string
          max_players: number
          num_teams?: number
          position_prices?: Json
          required_levels?: string[] | null
          start_time: string
          status?: Database["public"]["Enums"]["schedule_status"]
          team_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_time?: string
          id?: string
          location_id?: string
          max_players?: number
          num_teams?: number
          position_prices?: Json
          required_levels?: string[] | null
          start_time?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          team_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations_archive"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          player_id: string
          position: Database["public"]["Enums"]["player_position"] | null
          registration_id: string
          team_id: string
        }
        Insert: {
          id?: string
          player_id: string
          position?: Database["public"]["Enums"]["player_position"] | null
          registration_id: string
          team_id: string
        }
        Update: {
          id?: string
          player_id?: string
          position?: Database["public"]["Enums"]["player_position"] | null
          registration_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          schedule_id: string
          team_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          schedule_id: string
          team_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          schedule_id?: string
          team_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          birthday_day: number | null
          birthday_month: number | null
          birthday_year: number | null
          created_at: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_guest: boolean
          last_name: string | null
          player_contact_number: string | null
          profile_completed: boolean
          role: Database["public"]["Enums"]["user_role"]
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          birthday_year?: number | null
          created_at?: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          is_guest?: boolean
          last_name?: string | null
          player_contact_number?: string | null
          profile_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          birthday_year?: number | null
          created_at?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_guest?: boolean
          last_name?: string | null
          player_contact_number?: string | null
          profile_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      locations_archive: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          google_map_url: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          google_map_url?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          google_map_url?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      register_group_transaction: {
        Args: {
          p_payment: Json
          p_registrations: Json
          p_schedule_id: string
          p_team: Json
          p_team_members: Json
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      payment_status: "pending" | "review" | "paid" | "rejected"
      player_position:
        | "open_spiker"
        | "opposite_spiker"
        | "middle_blocker"
        | "setter"
        | "middle_setter"
      schedule_status: "open" | "full" | "cancelled" | "completed"
      skill_level:
        | "developmental"
        | "developmental_plus"
        | "intermediate"
        | "intermediate_plus"
        | "advanced"
      team_preference: "shuffle" | "group" | "team"
      user_role: "admin" | "player" | "facilitator" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      payment_status: ["pending", "review", "paid", "rejected"],
      player_position: [
        "open_spiker",
        "opposite_spiker",
        "middle_blocker",
        "setter",
        "middle_setter",
      ],
      schedule_status: ["open", "full", "cancelled", "completed"],
      skill_level: [
        "developmental",
        "developmental_plus",
        "intermediate",
        "intermediate_plus",
        "advanced",
      ],
      team_preference: ["shuffle", "group", "team"],
      user_role: ["admin", "player", "facilitator", "super_admin"],
    },
  },
} as const
