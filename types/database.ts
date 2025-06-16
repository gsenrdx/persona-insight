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
      interviewees: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          interview_detail: Json | null
          interviewee_fake_name: string | null
          interviewee_style: string | null
          interviewee_summary: string | null
          project_id: string | null
          session_date: string
          thumbnail: string | null
          updated_at: string | null
          user_description: string | null
          user_type: string
          x_axis: Json | null
          y_axis: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          interview_detail?: Json | null
          interviewee_fake_name?: string | null
          interviewee_style?: string | null
          interviewee_summary?: string | null
          project_id?: string | null
          session_date: string
          thumbnail?: string | null
          updated_at?: string | null
          user_description?: string | null
          user_type: string
          x_axis?: Json | null
          y_axis?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          interview_detail?: Json | null
          interviewee_fake_name?: string | null
          interviewee_style?: string | null
          interviewee_summary?: string | null
          project_id?: string | null
          session_date?: string
          thumbnail?: string | null
          updated_at?: string | null
          user_description?: string | null
          user_type?: string
          x_axis?: Json | null
          y_axis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interviewees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      persona_criteria_configurations: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          miso_dataset_id: string | null
          output_config: Json
          persona_matrix: Json
          project_id: string | null
          scoring_guidelines: Json
          unclassified_cells: Json
          updated_at: string | null
          x_axis: Json
          y_axis: Json
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          miso_dataset_id?: string | null
          output_config?: Json
          persona_matrix?: Json
          project_id?: string | null
          scoring_guidelines?: Json
          unclassified_cells?: Json
          updated_at?: string | null
          x_axis?: Json
          y_axis?: Json
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          miso_dataset_id?: string | null
          output_config?: Json
          persona_matrix?: Json
          project_id?: string | null
          scoring_guidelines?: Json
          unclassified_cells?: Json
          updated_at?: string | null
          x_axis?: Json
          y_axis?: Json
        }
        Relationships: [
          {
            foreignKeyName: "persona_criteria_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_criteria_configurations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          company_id: string
          created_at: string | null
          criteria_configuration_id: string | null
          id: string
          insight: string
          insight_quote: string
          matrix_position: Json | null
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
          company_id: string
          created_at?: string | null
          criteria_configuration_id?: string | null
          id?: string
          insight: string
          insight_quote: string
          matrix_position?: Json | null
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
          company_id?: string
          created_at?: string | null
          criteria_configuration_id?: string | null
          id?: string
          insight?: string
          insight_quote?: string
          matrix_position?: Json | null
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
            foreignKeyName: "personas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_criteria_configuration_id_fkey"
            columns: ["criteria_configuration_id"]
            isOneToOne: false
            referencedRelation: "persona_criteria_configurations"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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

// 편의를 위한 타입 별칭들
export type PersonaRow = Tables<'personas'>
export type PersonaInsert = TablesInsert<'personas'>
export type PersonaUpdate = TablesUpdate<'personas'>
export type IntervieweeRow = Tables<'interviewees'>
export type IntervieweeInsert = TablesInsert<'interviewees'>
export type IntervieweeUpdate = TablesUpdate<'interviewees'>
export type ProjectRow = Tables<'projects'>
export type ProjectInsert = TablesInsert<'projects'>
export type ProjectUpdate = TablesUpdate<'projects'>