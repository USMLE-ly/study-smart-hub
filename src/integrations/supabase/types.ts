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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          tier?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          tier?: string
          xp_reward?: number
        }
        Relationships: []
      }
      client_error_reports: {
        Row: {
          component_stack: string | null
          created_at: string
          id: string
          message: string
          metadata: Json
          route: string | null
          stack: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_system_deck: boolean | null
          name: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system_deck?: boolean | null
          name: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system_deck?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_progress: {
        Row: {
          box_number: number
          correct_count: number | null
          created_at: string
          flashcard_id: string
          id: string
          last_reviewed_at: string | null
          next_review_date: string
          review_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          box_number?: number
          correct_count?: number | null
          created_at?: string
          flashcard_id: string
          id?: string
          last_reviewed_at?: string | null
          next_review_date?: string
          review_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          box_number?: number
          correct_count?: number | null
          created_at?: string
          flashcard_id?: string
          id?: string
          last_reviewed_at?: string | null
          next_review_date?: string
          review_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_progress_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back_content: string
          back_image_url: string | null
          created_at: string
          deck_id: string
          front_content: string
          front_image_url: string | null
          id: string
          updated_at: string
        }
        Insert: {
          back_content: string
          back_image_url?: string | null
          created_at?: string
          deck_id: string
          front_content: string
          front_image_url?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          back_content?: string
          back_image_url?: string | null
          created_at?: string
          deck_id?: string
          front_content?: string
          front_image_url?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pdf_processing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_processing_sessions: {
        Row: {
          category: string
          created_at: string | null
          current_question: number | null
          error_message: string | null
          extracted_questions: number | null
          id: string
          page_metadata: Json | null
          pdf_name: string
          processed_pages: number | null
          status: string | null
          subject: string | null
          system: string | null
          total_pages: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          current_question?: number | null
          error_message?: string | null
          extracted_questions?: number | null
          id?: string
          page_metadata?: Json | null
          pdf_name: string
          processed_pages?: number | null
          status?: string | null
          subject?: string | null
          system?: string | null
          total_pages?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          current_question?: number | null
          error_message?: string | null
          extracted_questions?: number | null
          id?: string
          page_metadata?: Json | null
          pdf_name?: string
          processed_pages?: number | null
          status?: string | null
          subject?: string | null
          system?: string | null
          total_pages?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pdfs: {
        Row: {
          created_at: string
          filename: string
          id: string
          order_index: number
          processed_questions: number | null
          status: string
          total_questions: number | null
          updated_at: string
          upload_batch_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          order_index: number
          processed_questions?: number | null
          status?: string
          total_questions?: number | null
          updated_at?: string
          upload_batch_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          order_index?: number
          processed_questions?: number | null
          status?: string
          total_questions?: number | null
          updated_at?: string
          upload_batch_id?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_analytics: {
        Row: {
          created_at: string
          date: string
          id: string
          questions_attempted: number | null
          questions_correct: number | null
          subject: string
          system: string | null
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          questions_attempted?: number | null
          questions_correct?: number | null
          subject: string
          system?: string | null
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          questions_attempted?: number | null
          questions_correct?: number | null
          subject?: string
          system?: string | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          medical_school: string | null
          study_goal_hours_per_day: number | null
          target_exam_date: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          weekly_email_day: number | null
          weekly_email_enabled: boolean | null
          year_of_study: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          medical_school?: string | null
          study_goal_hours_per_day?: number | null
          target_exam_date?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          weekly_email_day?: number | null
          weekly_email_enabled?: boolean | null
          year_of_study?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          medical_school?: string | null
          study_goal_hours_per_day?: number | null
          target_exam_date?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          weekly_email_day?: number | null
          weekly_email_enabled?: boolean | null
          year_of_study?: string | null
        }
        Relationships: []
      }
      question_images: {
        Row: {
          created_at: string
          file_path: string
          id: string
          image_order: number
          position: string
          question_id: string
          source_type: string
          storage_url: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          image_order?: number
          position: string
          question_id: string
          source_type: string
          storage_url?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          image_order?: number
          position?: string
          question_id?: string
          source_type?: string
          storage_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_images_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_notes: {
        Row: {
          created_at: string
          id: string
          note_content: string
          question_id: string
          test_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_content: string
          question_id: string
          test_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_content?: string
          question_id?: string
          test_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_notes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_notes_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          explanation: string | null
          id: string
          is_correct: boolean
          option_letter: string
          option_text: string
          question_id: string
        }
        Insert: {
          explanation?: string | null
          id?: string
          is_correct?: boolean
          option_letter: string
          option_text: string
          question_id: string
        }
        Update: {
          explanation?: string | null
          id?: string
          is_correct?: boolean
          option_letter?: string
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category: string | null
          created_at: string
          difficulty: string | null
          explanation: string | null
          explanation_image_url: string | null
          has_image: boolean | null
          id: string
          image_description: string | null
          pdf_id: string | null
          question_hash: string | null
          question_image_url: string | null
          question_text: string
          source_page: number | null
          source_pdf: string | null
          subject: string
          system: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          explanation_image_url?: string | null
          has_image?: boolean | null
          id?: string
          image_description?: string | null
          pdf_id?: string | null
          question_hash?: string | null
          question_image_url?: string | null
          question_text: string
          source_page?: number | null
          source_pdf?: string | null
          subject: string
          system: string
        }
        Update: {
          category?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          explanation_image_url?: string | null
          has_image?: boolean | null
          id?: string
          image_description?: string | null
          pdf_id?: string | null
          question_hash?: string | null
          question_image_url?: string | null
          question_text?: string
          source_page?: number | null
          source_pdf?: string | null
          subject?: string
          system?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      study_schedules: {
        Row: {
          blocked_dates: string[] | null
          created_at: string
          end_date: string | null
          id: string
          schedule_data: Json
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_dates?: string[] | null
          created_at?: string
          end_date?: string | null
          id?: string
          schedule_data?: Json
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_dates?: string[] | null
          created_at?: string
          end_date?: string | null
          id?: string
          schedule_data?: Json
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_tasks: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_completed: boolean | null
          scheduled_date: string
          task_type: string
          title: string
          user_id: string
        }
        Insert: {
          color?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          scheduled_date: string
          task_type: string
          title: string
          user_id: string
        }
        Update: {
          color?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          scheduled_date?: string
          task_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      test_answers: {
        Row: {
          answered_at: string | null
          id: string
          is_correct: boolean | null
          is_marked: boolean | null
          question_id: string
          question_order: number
          selected_option_id: string | null
          test_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_marked?: boolean | null
          question_id: string
          question_order: number
          selected_option_id?: string | null
          test_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_marked?: boolean | null
          question_id?: string
          question_order?: number
          selected_option_id?: string | null
          test_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          completed_at: string | null
          correct_count: number | null
          created_at: string
          id: string
          incorrect_count: number | null
          mode: string
          name: string
          omitted_count: number | null
          question_count: number
          score_percentage: number | null
          started_at: string
          status: string
          subjects: string[] | null
          systems: string[] | null
          time_limit_seconds: number | null
          time_spent_seconds: number | null
          timer_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          id?: string
          incorrect_count?: number | null
          mode: string
          name: string
          omitted_count?: number | null
          question_count: number
          score_percentage?: number | null
          started_at?: string
          status?: string
          subjects?: string[] | null
          systems?: string[] | null
          time_limit_seconds?: number | null
          time_spent_seconds?: number | null
          timer_type?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          id?: string
          incorrect_count?: number | null
          mode?: string
          name?: string
          omitted_count?: number | null
          question_count?: number
          score_percentage?: number | null
          started_at?: string
          status?: string
          subjects?: string[] | null
          systems?: string[] | null
          time_limit_seconds?: number | null
          time_spent_seconds?: number | null
          timer_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gamification: {
        Row: {
          created_at: string
          current_streak: number
          focus_minutes: number
          id: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          tasks_completed: number
          updated_at: string
          user_id: string
          xp_points: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          focus_minutes?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          tasks_completed?: number
          updated_at?: string
          user_id: string
          xp_points?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          focus_minutes?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          tasks_completed?: number
          updated_at?: string
          user_id?: string
          xp_points?: number
        }
        Relationships: []
      }
      validation_logs: {
        Row: {
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          status: string
          user_id: string
          validated_at: string
          validation_type: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          status: string
          user_id: string
          validated_at?: string
          validation_type: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          status?: string
          user_id?: string
          validated_at?: string
          validation_type?: string
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
    Enums: {},
  },
} as const
