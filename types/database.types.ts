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
      sources: {
        Row: {
          id: string
          source_type: string
          title: string | null
          url: string
          publication_date: string | null
          publisher: string | null
          reliability_tier: string
          extraction_method: string
          raw_text_snapshot: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_type?: string
          title?: string | null
          url: string
          publication_date?: string | null
          publisher?: string | null
          reliability_tier?: string
          extraction_method?: string
          raw_text_snapshot?: string | null
          created_at?: string
        }
        Update: {
          source_type?: string
          title?: string | null
          url?: string
          publication_date?: string | null
          publisher?: string | null
          reliability_tier?: string
          extraction_method?: string
          raw_text_snapshot?: string | null
        }
        Relationships: []
      }
      review_queue: {
        Row: {
          id: string
          source_id: string | null
          raw_extracted_data: Json
          suggested_company: string | null
          match_confidence: number | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          raw_extracted_data?: Json
          suggested_company?: string | null
          match_confidence?: number | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          source_id?: string | null
          raw_extracted_data?: Json
          suggested_company?: string | null
          match_confidence?: number | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_source_id_fkey"
            columns: ["source_id"]
            referencedRelation: "sources"
            referencedColumns: ["id"]
          }
        ]
      }
      pipeline_jobs: {
        Row: {
          id: string
          run_at: string
          source_feed: string | null
          articles_fetched: number
          articles_filtered: number
          records_extracted: number
          records_auto_approved: number
          records_flagged: number
          run_status: string
          error_log: string | null
          created_at: string
        }
        Insert: {
          id?: string
          run_at?: string
          source_feed?: string | null
          articles_fetched?: number
          articles_filtered?: number
          records_extracted?: number
          records_auto_approved?: number
          records_flagged?: number
          run_status?: string
          error_log?: string | null
          created_at?: string
        }
        Update: {
          run_at?: string
          source_feed?: string | null
          articles_fetched?: number
          articles_filtered?: number
          records_extracted?: number
          records_auto_approved?: number
          records_flagged?: number
          run_status?: string
          error_log?: string | null
        }
        Relationships: []
      }
      startup_aliases: {
        Row: {
          id: string
          company: string
          alias_name: string
          alias_type: string
          created_at: string
        }
        Insert: {
          id?: string
          company: string
          alias_name: string
          alias_type?: string
          created_at?: string
        }
        Update: {
          company?: string
          alias_name?: string
          alias_type?: string
        }
        Relationships: []
      }
      investor_aliases: {
        Row: {
          id: string
          investor_name: string
          alias_name: string
          created_at: string
        }
        Insert: {
          id?: string
          investor_name: string
          alias_name: string
          created_at?: string
        }
        Update: {
          investor_name?: string
          alias_name?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          company: string
          company_url: string | null
          amount_inr: number
          amount_usd: number
          stage: string
          sectors: string[]
          investors: string[]
          lead_investor: string | null
          deal_date: string
          location: string
          description: string | null
          source_url: string | null
          week_folder: string | null
          record_status: string
          date_confidence: string | null
          stage_confidence: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company: string
          company_url?: string | null
          amount_inr?: number
          amount_usd?: number
          stage: string
          sectors?: string[]
          investors?: string[]
          lead_investor?: string | null
          deal_date: string
          location: string
          description?: string | null
          source_url?: string | null
          week_folder?: string | null
          record_status?: string
          date_confidence?: string | null
          stage_confidence?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          company?: string
          company_url?: string | null
          amount_inr?: number
          amount_usd?: number
          stage?: string
          sectors?: string[]
          investors?: string[]
          lead_investor?: string | null
          deal_date?: string
          location?: string
          description?: string | null
          source_url?: string | null
          week_folder?: string | null
          record_status?: string
          date_confidence?: string | null
          stage_confidence?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      deal_notes: {
        Row: {
          id: string
          user_id: string
          deal_id: string
          content: string
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          deal_id: string
          content?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          tags?: string[]
          updated_at?: string
        }
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
      dashboards: {
        Row: {
          id: string
          user_id: string
          name: string
          layout: Json
          widgets: Json
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          layout?: Json
          widgets?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          layout?: Json
          widgets?: Json
          is_default?: boolean
          updated_at?: string
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
