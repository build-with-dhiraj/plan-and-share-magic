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
      articles: {
        Row: {
          content: string | null
          id: string
          ingested_at: string | null
          layer: string | null
          processed: boolean | null
          published_at: string | null
          source_name: string
          source_url: string
          summary: string | null
          syllabus_tags: string[] | null
          title: string
        }
        Insert: {
          content?: string | null
          id?: string
          ingested_at?: string | null
          layer?: string | null
          processed?: boolean | null
          published_at?: string | null
          source_name: string
          source_url: string
          summary?: string | null
          syllabus_tags?: string[] | null
          title: string
        }
        Update: {
          content?: string | null
          id?: string
          ingested_at?: string | null
          layer?: string | null
          processed?: boolean | null
          published_at?: string | null
          source_name?: string
          source_url?: string
          summary?: string | null
          syllabus_tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_completions: {
        Row: {
          attempt_id: string | null
          challenge_date: string
          completed_at: string
          completion_bonus: number
          id: string
          score: number
          total_xp: number
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          challenge_date?: string
          completed_at?: string
          completion_bonus?: number
          id?: string
          score: number
          total_xp?: number
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          challenge_date?: string
          completed_at?: string
          completion_bonus?: number
          id?: string
          score?: number
          total_xp?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_completions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      facts: {
        Row: {
          article_id: string | null
          confidence: number | null
          created_at: string | null
          fact_text: string
          id: string
          source_url: string
          syllabus_tags: string[] | null
          verified: boolean | null
        }
        Insert: {
          article_id?: string | null
          confidence?: number | null
          created_at?: string | null
          fact_text: string
          id?: string
          source_url: string
          syllabus_tags?: string[] | null
          verified?: boolean | null
        }
        Update: {
          article_id?: string | null
          confidence?: number | null
          created_at?: string | null
          fact_text?: string
          id?: string
          source_url?: string
          syllabus_tags?: string[] | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "facts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_bank: {
        Row: {
          article_id: string | null
          correct_index: number
          created_at: string | null
          difficulty: string | null
          explanation: string
          fact_id: string | null
          id: string
          is_daily_eligible: boolean | null
          is_verified: boolean | null
          options: string[]
          question: string
          source: string | null
          source_url: string | null
          statements: string[] | null
          syllabus_tags: string[] | null
          time_limit: number | null
          topic: string
          year: string | null
        }
        Insert: {
          article_id?: string | null
          correct_index: number
          created_at?: string | null
          difficulty?: string | null
          explanation: string
          fact_id?: string | null
          id?: string
          is_daily_eligible?: boolean | null
          is_verified?: boolean | null
          options: string[]
          question: string
          source?: string | null
          source_url?: string | null
          statements?: string[] | null
          syllabus_tags?: string[] | null
          time_limit?: number | null
          topic: string
          year?: string | null
        }
        Update: {
          article_id?: string | null
          correct_index?: number
          created_at?: string | null
          difficulty?: string | null
          explanation?: string
          fact_id?: string | null
          id?: string
          is_daily_eligible?: boolean | null
          is_verified?: boolean | null
          options?: string[]
          question?: string
          source?: string | null
          source_url?: string | null
          statements?: string[] | null
          syllabus_tags?: string[] | null
          time_limit?: number | null
          topic?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_bank_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_bank_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          exam_target: string | null
          id: string
          onboarding_complete: boolean | null
          optional_subjects: string[] | null
          study_hours_per_day: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_target?: string | null
          id?: string
          onboarding_complete?: boolean | null
          optional_subjects?: string[] | null
          study_hours_per_day?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_target?: string | null
          id?: string
          onboarding_complete?: boolean | null
          optional_subjects?: string[] | null
          study_hours_per_day?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number
          time_taken_seconds: number | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_index: number
          time_taken_seconds?: number | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number
          time_taken_seconds?: number | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          best_streak: number
          completed_at: string
          correct_answers: number
          duration_seconds: number | null
          id: string
          quiz_type: string
          timed_mode: boolean | null
          topic: string | null
          total_questions: number
          total_xp: number
          user_id: string
        }
        Insert: {
          best_streak?: number
          completed_at?: string
          correct_answers: number
          duration_seconds?: number | null
          id?: string
          quiz_type: string
          timed_mode?: boolean | null
          topic?: string | null
          total_questions: number
          total_xp?: number
          user_id: string
        }
        Update: {
          best_streak?: number
          completed_at?: string
          correct_answers?: number
          duration_seconds?: number | null
          id?: string
          quiz_type?: string
          timed_mode?: boolean | null
          topic?: string | null
          total_questions?: number
          total_xp?: number
          user_id?: string
        }
        Relationships: []
      }
      spaced_cards: {
        Row: {
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          next_review: string
          question_id: string
          repetitions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review?: string
          question_id: string
          repetitions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review?: string
          question_id?: string
          repetitions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_leaderboard: {
        Row: {
          avatar_url: string | null
          challenge_date: string | null
          display_name: string | null
          rank: number | null
          score: number | null
          total_xp: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
