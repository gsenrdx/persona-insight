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
      interviewees: {
        Row: {
          charging_pattern_scores: Json | null
          created_at: string | null
          id: string
          interview_detail: Json | null
          interviewee_style: string | null
          interviewee_summary: string | null
          session_date: string
          thumbnail: string | null
          updated_at: string | null
          user_description: string | null
          user_type: string
          value_orientation_scores: Json | null
        }
        Insert: {
          charging_pattern_scores?: Json | null
          created_at?: string | null
          id?: string
          interview_detail?: Json | null
          interviewee_style?: string | null
          interviewee_summary?: string | null
          session_date: string
          thumbnail?: string | null
          updated_at?: string | null
          user_description?: string | null
          user_type: string
          value_orientation_scores?: Json | null
        }
        Update: {
          charging_pattern_scores?: Json | null
          created_at?: string | null
          id?: string
          interview_detail?: Json | null
          interviewee_style?: string | null
          interviewee_summary?: string | null
          session_date?: string
          thumbnail?: string | null
          updated_at?: string | null
          user_description?: string | null
          user_type?: string
          value_orientation_scores?: Json | null
        }
        Relationships: []
      }
      personas: {
        Row: {
          created_at: string | null
          id: string
          insight: string
          insight_quote: string
          needs: string
          painpoints: string
          persona_description: string
          persona_style: string
          persona_summary: string
          persona_type: string
          thumbnail: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          insight: string
          insight_quote: string
          needs: string
          painpoints: string
          persona_description: string
          persona_style: string
          persona_summary: string
          persona_type: string
          thumbnail?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          insight?: string
          insight_quote?: string
          needs?: string
          painpoints?: string
          persona_description?: string
          persona_style?: string
          persona_summary?: string
          persona_type?: string
          thumbnail?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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

// 편리한 타입 별칭들
export type IntervieweeRow = Tables<'interviewees'>
export type IntervieweeInsert = TablesInsert<'interviewees'>
export type IntervieweeUpdate = TablesUpdate<'interviewees'>

export type PersonaRow = Tables<'personas'>
export type PersonaInsert = TablesInsert<'personas'>
export type PersonaUpdate = TablesUpdate<'personas'> 