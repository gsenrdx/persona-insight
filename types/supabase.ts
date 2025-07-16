export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string | null
          description: string | null
          domains: string[] | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          domains?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          domains?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      glossary: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          definition: string
          id: string
          term: string
          updated_at: string | null
          updated_by: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          definition: string
          id?: string
          term: string
          updated_at?: string | null
          updated_by: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          definition?: string
          id?: string
          term?: string
          updated_at?: string | null
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "glossary_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "glossary_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_note_replies: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean | null
          note_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          note_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          note_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_interview_note_replies_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_note_replies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_note_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_note_replies_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "interview_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          interview_id: string
          is_deleted: boolean | null
          script_item_ids: string[]
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          interview_id: string
          is_deleted?: boolean | null
          script_item_ids: string[]
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          interview_id?: string
          is_deleted?: boolean | null
          script_item_ids?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_interview_notes_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_notes_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviewees: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_path: string | null
          id: string
          interview_detail: Json | null
          interviewee_fake_name: string | null
          interviewee_style: string | null
          interviewee_summary: string | null
          persona_id: string | null
          persona_reflected: boolean | null
          project_id: string | null
          raw_text: string | null
          session_date: string | null
          thumbnail: string | null
          updated_at: string | null
          user_description: string | null
          user_type: string | null
          x_axis: Json | null
          y_axis: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_path?: string | null
          id?: string
          interview_detail?: Json | null
          interviewee_fake_name?: string | null
          interviewee_style?: string | null
          interviewee_summary?: string | null
          persona_id?: string | null
          persona_reflected?: boolean | null
          project_id?: string | null
          raw_text?: string | null
          session_date?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          user_description?: string | null
          user_type?: string | null
          x_axis?: Json | null
          y_axis?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_path?: string | null
          id?: string
          interview_detail?: Json | null
          interviewee_fake_name?: string | null
          interviewee_style?: string | null
          interviewee_summary?: string | null
          persona_id?: string | null
          persona_reflected?: boolean | null
          project_id?: string | null
          raw_text?: string | null
          session_date?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          user_description?: string | null
          user_type?: string | null
          x_axis?: Json | null
          y_axis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_interviewees_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviewees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviewees_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviewees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          ai_persona_explanation: string | null
          ai_persona_match: string | null
          cleaned_script: Json | null
          company_id: string
          confirmed_persona_definition_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          hmw_questions: Json | null
          id: string
          interview_date: string | null
          interview_quality_assessment: Json | null
          interviewee_profile: Json | null
          key_takeaways: string[] | null
          metadata: Json | null
          persona_id: string | null
          primary_needs: Json | null
          primary_pain_points: Json | null
          project_id: string | null
          raw_text: string | null
          script_sections: Json | null
          session_info: Json | null
          status: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          ai_persona_explanation?: string | null
          ai_persona_match?: string | null
          cleaned_script?: Json | null
          company_id: string
          confirmed_persona_definition_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          hmw_questions?: Json | null
          id?: string
          interview_date?: string | null
          interview_quality_assessment?: Json | null
          interviewee_profile?: Json | null
          key_takeaways?: string[] | null
          metadata?: Json | null
          persona_id?: string | null
          primary_needs?: Json | null
          primary_pain_points?: Json | null
          project_id?: string | null
          raw_text?: string | null
          script_sections?: Json | null
          session_info?: Json | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_persona_explanation?: string | null
          ai_persona_match?: string | null
          cleaned_script?: Json | null
          company_id?: string
          confirmed_persona_definition_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          hmw_questions?: Json | null
          id?: string
          interview_date?: string | null
          interview_quality_assessment?: Json | null
          interviewee_profile?: Json | null
          key_takeaways?: string[] | null
          metadata?: Json | null
          persona_id?: string | null
          primary_needs?: Json | null
          primary_pain_points?: Json | null
          project_id?: string | null
          raw_text?: string | null
          script_sections?: Json | null
          session_info?: Json | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_interviews_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_ai_persona_match_fkey"
            columns: ["ai_persona_match"]
            isOneToOne: false
            referencedRelation: "persona_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_confirmed_persona_definition_id_fkey"
            columns: ["confirmed_persona_definition_id"]
            isOneToOne: false
            referencedRelation: "persona_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      key_takeaways: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          project_id: string | null
          takeaway_text: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          takeaway_text: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          takeaway_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_takeaways_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_takeaways_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      main_topics: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          project_id: string | null
          topic_name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          topic_name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          topic_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "main_topics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "main_topics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_classification_types: {
        Row: {
          classification_id: string
          created_at: string | null
          description: string
          display_order: number
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          classification_id: string
          created_at?: string | null
          description: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          classification_id?: string
          created_at?: string | null
          description?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_classification_types_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "persona_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_classifications: {
        Row: {
          company_id: string
          created_at: string | null
          description: string
          display_order: number
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_classifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_combinations: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          persona_code: string
          type_ids: string[]
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          persona_code: string
          type_ids: string[]
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          persona_code?: string
          type_ids?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_combinations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_definitions: {
        Row: {
          created_at: string | null
          description: string | null
          evolution_path: string | null
          id: string
          metrics: Json
          name_en: string
          name_ko: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          evolution_path?: string | null
          id: string
          metrics: Json
          name_en: string
          name_ko: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          evolution_path?: string | null
          id?: string
          metrics?: Json
          name_en?: string
          name_ko?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      persona_topic_documents: {
        Row: {
          created_at: string | null
          document_title: string | null
          id: string
          interview_count: number | null
          last_synced_at: string | null
          miso_document_id: string
          persona_id: string
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_title?: string | null
          id?: string
          interview_count?: number | null
          last_synced_at?: string | null
          miso_document_id: string
          persona_id: string
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_title?: string | null
          id?: string
          interview_count?: number | null
          last_synced_at?: string | null
          miso_document_id?: string
          persona_id?: string
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_topic_documents_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_topic_documents_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "main_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_type_mappings: {
        Row: {
          combination_id: string | null
          company_id: string
          created_at: string | null
          id: string
          legacy_persona_type: string
          updated_at: string | null
        }
        Insert: {
          combination_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          legacy_persona_type: string
          updated_at?: string | null
        }
        Update: {
          combination_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          legacy_persona_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_type_mappings_combination_id_fkey"
            columns: ["combination_id"]
            isOneToOne: false
            referencedRelation: "persona_combinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_type_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          active: boolean | null
          combination_id: string | null
          company_id: string
          created_at: string | null
          criteria_configuration_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          insight: string
          insight_quote: string
          matrix_position: Json | null
          miso_dataset_id: string | null
          needs: string
          painpoints: string
          persona_description: string
          persona_style: string
          persona_summary: string
          persona_title: string | null
          persona_type: string
          project_id: string | null
          thumbnail: string | null
          updated_at: string | null
          x_max: number | null
          x_min: number | null
          y_max: number | null
          y_min: number | null
        }
        Insert: {
          active?: boolean | null
          combination_id?: string | null
          company_id: string
          created_at?: string | null
          criteria_configuration_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          insight: string
          insight_quote: string
          matrix_position?: Json | null
          miso_dataset_id?: string | null
          needs: string
          painpoints: string
          persona_description: string
          persona_style: string
          persona_summary: string
          persona_title?: string | null
          persona_type: string
          project_id?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          x_max?: number | null
          x_min?: number | null
          y_max?: number | null
          y_min?: number | null
        }
        Update: {
          active?: boolean | null
          combination_id?: string | null
          company_id?: string
          created_at?: string | null
          criteria_configuration_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          insight?: string
          insight_quote?: string
          matrix_position?: Json | null
          miso_dataset_id?: string | null
          needs?: string
          painpoints?: string
          persona_description?: string
          persona_style?: string
          persona_summary?: string
          persona_title?: string | null
          persona_type?: string
          project_id?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          x_max?: number | null
          x_min?: number | null
          y_max?: number | null
          y_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_personas_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_combination_id_fkey"
            columns: ["combination_id"]
            isOneToOne: false
            referencedRelation: "persona_combinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          project_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          project_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_summaries: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          excluded_interview_ids: string[] | null
          id: string
          interview_count_at_creation: number
          interview_ids_at_creation: string[] | null
          last_interview_id: string | null
          project_id: string
          summary_text: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          excluded_interview_ids?: string[] | null
          id?: string
          interview_count_at_creation?: number
          interview_ids_at_creation?: string[] | null
          last_interview_id?: string | null
          project_id: string
          summary_text: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          excluded_interview_ids?: string[] | null
          id?: string
          interview_count_at_creation?: number
          interview_ids_at_creation?: string[] | null
          last_interview_id?: string | null
          project_id?: string
          summary_text?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_summaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          join_method: string | null
          master_id: string | null
          name: string
          password: string | null
          purpose: string | null
          research_method: string | null
          start_date: string | null
          target_audience: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          join_method?: string | null
          master_id?: string | null
          name: string
          password?: string | null
          purpose?: string | null
          research_method?: string | null
          start_date?: string | null
          target_audience?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          join_method?: string | null
          master_id?: string | null
          name?: string
          password?: string | null
          purpose?: string | null
          research_method?: string | null
          start_date?: string | null
          target_audience?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      script_sections: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          project_id: string | null
          section_name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          section_name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          section_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_permission: {
        Args: { p_user_id: string; p_company_id: string; p_project_id?: string }
        Returns: {
          has_access: boolean
          can_edit: boolean
          user_role: string
          project_role: string
        }[]
      }
      get_changed_fields: {
        Args: { old_data: Json; new_data: Json }
        Returns: string[]
      }
      get_company_members_for_project: {
        Args: { p_project_id: string }
        Returns: {
          id: string
          name: string
          role: string
          avatar_url: string
          is_active: boolean
        }[]
      }
      get_interview_with_access_check: {
        Args: { p_interview_id: string; p_user_id: string }
        Returns: {
          id: string
          file_path: string
          company_id: string
          has_access: boolean
        }[]
      }
      get_my_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_new_interview_count: {
        Args: { p_project_id: string }
        Returns: {
          new_count: number
          new_interview_ids: string[]
          current_completed_count: number
        }[]
      }
      get_project_members_with_profiles: {
        Args: { p_project_id: string }
        Returns: {
          id: string
          user_id: string
          project_id: string
          role: string
          joined_at: string
          created_at: string
          updated_at: string
          profile_id: string
          profile_name: string
          profile_email: string
          profile_avatar_url: string
        }[]
      }
      get_projects_with_members: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: {
          project_id: string
          project_name: string
          project_description: string
          project_visibility: string
          project_join_method: string
          project_created_at: string
          project_created_by: string
          member_count: number
          interview_count: number
          persona_count: number
          top_members: Json
          user_membership: Json
        }[]
      }
      get_projects_with_stats_optimized: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          name: string
          description: string
          visibility: string
          join_method: string
          company_id: string
          created_at: string
          updated_at: string
          created_by: string
          user_role: string
          member_count: number
          interviewee_count: number
          persona_count: number
        }[]
      }
      get_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      migrate_persona_types_to_combinations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      pgmq_archive: {
        Args: { queue_name: string; msg_id: number }
        Returns: boolean
      }
      pgmq_delete: {
        Args: { queue_name: string; msg_id: number }
        Returns: boolean
      }
      pgmq_metrics: {
        Args: { p_queue_name: string }
        Returns: {
          queue_name: string
          queue_length: number
          newest_msg_age_sec: number
          oldest_msg_age_sec: number
          total_messages: number
        }[]
      }
      pgmq_read: {
        Args: { queue_name: string; vt: number; qty?: number }
        Returns: {
          msg_id: number
          read_ct: number
          enqueued_at: string
          vt_at: string
          message: Json
        }[]
      }
      pgmq_send: {
        Args: { queue_name: string; msg: Json; delay_seconds?: number }
        Returns: number
      }
      search_interview_with_permissions: {
        Args: {
          p_company_id: string
          p_user_id: string
          p_persona_name: string
        }
        Returns: {
          interview_id: string
          project_id: string
          interviewee_fake_name: string
          has_access: boolean
        }[]
      }
    }
    Enums: {
      user_role: "super_admin" | "company_admin" | "company_user"
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
      user_role: ["super_admin", "company_admin", "company_user"],
    },
  },
} as const