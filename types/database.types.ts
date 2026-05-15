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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          notification_prefs: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          notification_prefs?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          notification_prefs?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          company: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company: string
          created_at?: string
        }
        Update: {
          company?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          deal_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          deal_id: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      saved_searches: {
        Row: {
          id: string
          user_id: string
          name: string
          filters: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          filters: Json
          created_at?: string
        }
        Update: {
          name?: string
          filters?: Json
        }
        Relationships: []
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          sector: string | null
          stage: string | null
          min_amount: number | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sector?: string | null
          stage?: string | null
          min_amount?: number | null
          active?: boolean
          created_at?: string
        }
        Update: {
          sector?: string | null
          stage?: string | null
          min_amount?: number | null
          active?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
