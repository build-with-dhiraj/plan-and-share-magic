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
          conclusion: string | null
          content: string | null
          depth_tier: string | null
          detailed_analysis: Json | null
          faqs: Json | null
          gs_papers: string[] | null
          id: string
          ingested_at: string | null
          layer: string | null
          mains_angle: string | null
          mains_question: string | null
          prelims_keywords: string[] | null
          processed: boolean | null
          published_at: string | null
          source_name: string
          source_url: string
          summary: string | null
          syllabus_tags: string[] | null
          title: string
          upsc_relevance: number | null
        }
        Insert: {
          conclusion?: string | null
          content?: string | null
          depth_tier?: string | null
          detailed_analysis?: Json | null
          faqs?: Json | null
          gs_papers?: string[] | null
          id?: string
          ingested_at?: string | null
          layer?: string | null
          mains_angle?: string | null
          mains_question?: string | null
          prelims_keywords?: string[] | null
          processed?: boolean | null
          published_at?: string | null
          source_name: string
          source_url: string
          summary?: string | null
          syllabus_tags?: string[] | null
          title: string
          upsc_relevance?: number | null
        }
        Update: {
          conclusion?: string | null
          content?: string | null
          depth_tier?: string | null
          detailed_analysis?: Json | null
          faqs?: Json | null
          gs_papers?: string[] | null
          id?: string
          ingested_at?: string | null
          layer?: string | null
          mains_angle?: string | null
          mains_question?: string | null
          prelims_keywords?: string[] | null
          processed?: boolean | null
          published_at?: string | null
          source_name?: string
          source_url?: string
          summary?: string | null
          syllabus_tags?: string[] | null
          title?: string
          upsc_relevance?: number | null
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
      pyq_sources: {
        Row: {
          id: string
          name: string
          source_type: string
          base_url: string | null
          is_active: boolean
          trust_level: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          source_type: string
          base_url?: string | null
          is_active?: boolean
          trust_level?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          source_type?: string
          base_url?: string | null
          is_active?: boolean
          trust_level?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pyq_documents: {
        Row: {
          id: string
          source_id: string
          year: number
          exam_stage: string
          paper_code: string
          source_url: string
          source_file_hash: string | null
          raw_storage_path: string | null
          verification_status: string
          is_official: boolean
          official_release_date: string | null
          extraction_method: string | null
          parse_quality: number | null
          human_reviewed: boolean
          total_questions: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          year: number
          exam_stage: string
          paper_code: string
          source_url: string
          source_file_hash?: string | null
          raw_storage_path?: string | null
          verification_status?: string
          is_official?: boolean
          official_release_date?: string | null
          extraction_method?: string | null
          parse_quality?: number | null
          human_reviewed?: boolean
          total_questions?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          year?: number
          exam_stage?: string
          paper_code?: string
          source_url?: string
          source_file_hash?: string | null
          raw_storage_path?: string | null
          verification_status?: string
          is_official?: boolean
          official_release_date?: string | null
          extraction_method?: string | null
          parse_quality?: number | null
          human_reviewed?: boolean
          total_questions?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "pyq_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_questions: {
        Row: {
          id: string
          document_id: string
          year: number
          exam_stage: string
          paper_code: string
          question_number: number | null
          question_text: string
          raw_question_text: string | null
          question_type: string
          marks: number | null
          word_limit: number | null
          raw_source_page: number | null
          is_published: boolean
          verification_status: string
          parse_quality: number
          human_reviewed: boolean
          confidence_score: number
          gs_papers: string[]
          topic: string | null
          syllabus_tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          year: number
          exam_stage: string
          paper_code: string
          question_number?: number | null
          question_text: string
          raw_question_text?: string | null
          question_type: string
          marks?: number | null
          word_limit?: number | null
          raw_source_page?: number | null
          is_published?: boolean
          verification_status?: string
          parse_quality?: number
          human_reviewed?: boolean
          confidence_score?: number
          gs_papers?: string[]
          topic?: string | null
          syllabus_tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          year?: number
          exam_stage?: string
          paper_code?: string
          question_number?: number | null
          question_text?: string
          raw_question_text?: string | null
          question_type?: string
          marks?: number | null
          word_limit?: number | null
          raw_source_page?: number | null
          is_published?: boolean
          verification_status?: string
          parse_quality?: number
          human_reviewed?: boolean
          confidence_score?: number
          gs_papers?: string[]
          topic?: string | null
          syllabus_tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_questions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pyq_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_prelims_options: {
        Row: {
          id: string
          question_id: string
          option_label: string
          option_text: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          question_id: string
          option_label: string
          option_text: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          question_id?: string
          option_label?: string
          option_text?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pyq_prelims_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_prelims_keys: {
        Row: {
          id: string
          question_id: string
          answer_label: string
          key_source: string
          is_official: boolean
          source_url: string | null
          source_file_hash: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          answer_label: string
          key_source: string
          is_official?: boolean
          source_url?: string | null
          source_file_hash?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          answer_label?: string
          key_source?: string
          is_official?: boolean
          source_url?: string | null
          source_file_hash?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_prelims_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_tags: {
        Row: {
          id: string
          question_id: string
          tag_type: string
          tag_value: string
          confidence: number
          source: string
        }
        Insert: {
          id?: string
          question_id: string
          tag_type: string
          tag_value: string
          confidence?: number
          source: string
        }
        Update: {
          id?: string
          question_id?: string
          tag_type?: string
          tag_value?: string
          confidence?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_question_embeddings: {
        Row: {
          id: string
          question_id: string
          embedding: unknown
          model: string
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          embedding: unknown
          model: string
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          embedding?: unknown
          model?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_question_embeddings_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_pyq_links: {
        Row: {
          id: string
          article_id: string
          pyq_question_id: string
          link_type: string
          link_reason: string | null
          confidence_score: number
          lexical_score: number | null
          semantic_score: number | null
          syllabus_overlap_score: number | null
          gs_overlap_score: number | null
          human_reviewed: boolean
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          pyq_question_id: string
          link_type: string
          link_reason?: string | null
          confidence_score: number
          lexical_score?: number | null
          semantic_score?: number | null
          syllabus_overlap_score?: number | null
          gs_overlap_score?: number | null
          human_reviewed?: boolean
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          pyq_question_id?: string
          link_type?: string
          link_reason?: string | null
          confidence_score?: number
          lexical_score?: number | null
          semantic_score?: number | null
          syllabus_overlap_score?: number | null
          gs_overlap_score?: number | null
          human_reviewed?: boolean
          is_published?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_pyq_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_pyq_links_pyq_question_id_fkey"
            columns: ["pyq_question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_import_jobs: {
        Row: {
          id: string
          source_id: string | null
          status: string
          document_url: string | null
          year: number | null
          exam_stage: string | null
          paper_code: string | null
          questions_extracted: number
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          status?: string
          document_url?: string | null
          year?: number | null
          exam_stage?: string | null
          paper_code?: string | null
          questions_extracted?: number
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          status?: string
          document_url?: string | null
          year?: number | null
          exam_stage?: string | null
          paper_code?: string | null
          questions_extracted?: number
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_import_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "pyq_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_parse_events: {
        Row: {
          id: string
          document_id: string
          event_type: string | null
          quality_score: number | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          event_type?: string | null
          quality_score?: number | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          event_type?: string | null
          quality_score?: number | null
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_parse_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pyq_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_verification_events: {
        Row: {
          id: string
          question_id: string | null
          document_id: string | null
          old_status: string | null
          new_status: string | null
          reason: string | null
          verified_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          question_id?: string | null
          document_id?: string | null
          old_status?: string | null
          new_status?: string | null
          reason?: string | null
          verified_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string | null
          document_id?: string | null
          old_status?: string | null
          new_status?: string | null
          reason?: string | null
          verified_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_verification_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pyq_verification_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pyq_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_model_answers: {
        Row: {
          id: string
          question_id: string
          answer_type: string
          answer_text: string
          answer_framework: Json | null
          source_attribution: string | null
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          answer_type: string
          answer_text: string
          answer_framework?: Json | null
          source_attribution?: string | null
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          answer_type?: string
          answer_text?: string
          answer_framework?: Json | null
          source_attribution?: string | null
          is_published?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_model_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pyq_attempts: {
        Row: {
          id: string
          user_id: string
          practice_type: string
          year_filter: number | null
          paper_filter: string | null
          total_questions: number | null
          correct_answers: number | null
          total_xp: number
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          practice_type: string
          year_filter?: number | null
          paper_filter?: string | null
          total_questions?: number | null
          correct_answers?: number | null
          total_xp?: number
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          practice_type?: string
          year_filter?: number | null
          paper_filter?: string | null
          total_questions?: number | null
          correct_answers?: number | null
          total_xp?: number
          completed_at?: string
        }
        Relationships: []
      }
      user_pyq_answers: {
        Row: {
          id: string
          attempt_id: string
          user_id: string
          pyq_question_id: string
          selected_option: string | null
          is_correct: boolean | null
          answer_text: string | null
          time_taken_seconds: number | null
          xp_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          user_id: string
          pyq_question_id: string
          selected_option?: string | null
          is_correct?: boolean | null
          answer_text?: string | null
          time_taken_seconds?: number | null
          xp_earned?: number
          created_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string
          user_id?: string
          pyq_question_id?: string
          selected_option?: string | null
          is_correct?: boolean | null
          answer_text?: string | null
          time_taken_seconds?: number | null
          xp_earned?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pyq_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "user_pyq_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pyq_answers_pyq_question_id_fkey"
            columns: ["pyq_question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
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
