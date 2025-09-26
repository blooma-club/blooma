import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경 변수가 누락되었습니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 현재 시스템에 맞는 Database 타입 정의
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name?: string
          avatar_url?: string
          credits: number
          credits_used: number
          credits_reset_date: string
          subscription_tier: 'basic' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string
          avatar_url?: string
          credits?: number
          credits_used?: number
          credits_reset_date?: string
          subscription_tier?: 'basic' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string
          credits?: number
          credits_used?: number
          credits_reset_date?: string
          subscription_tier?: 'basic' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
      }
      ai_usage: {
        Row: {
          id: string
          user_id: string
          operation_type: 'text_generation' | 'image_generation' | 'script_generation' | 'image_edit'
          provider: string
          model_name?: string
          credits_consumed: number
          input_tokens?: number
          output_tokens?: number
          image_count?: number
          success: boolean
          error_message?: string
          metadata?: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          operation_type: 'text_generation' | 'image_generation' | 'script_generation' | 'image_edit'
          provider: string
          model_name?: string
          credits_consumed?: number
          input_tokens?: number
          output_tokens?: number
          image_count?: number
          success?: boolean
          error_message?: string
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          operation_type?: 'text_generation' | 'image_generation' | 'script_generation' | 'image_edit'
          provider?: string
          model_name?: string
          credits_consumed?: number
          input_tokens?: number
          output_tokens?: number
          image_count?: number
          success?: boolean
          error_message?: string
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'usage' | 'purchase' | 'refund' | 'bonus' | 'reset'
          amount: number
          description: string
          ai_usage_id?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'usage' | 'purchase' | 'refund' | 'bonus' | 'reset'
          amount: number
          description: string
          ai_usage_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'usage' | 'purchase' | 'refund' | 'bonus' | 'reset'
          amount?: number
          description?: string
          ai_usage_id?: string
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          description?: string
          is_public: boolean // DB 스키마에는 유지하나 전체 Private로 고정
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      storyboards: {
        Row: {
          id: string
          user_id: string
          project_id?: string
          title: string
          description?: string
          is_public: boolean
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string
          title: string
          description?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          title?: string
          description?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          project_id: string
          user_id: string
          type: 'scene' | 'card' // 현재 시스템에 맞게 간소화
          title: string
          content: string
          user_input?: string
          image_urls?: string[]
          selected_image_url?: number

          // Storyboard 전용 필드 (통합 설계)
          scene_number?: number
          shot_type?: string
          angle?: string
          background?: string
          mood_lighting?: string
          dialogue?: string
          sound?: string
          image_prompt?: string
          storyboard_status?: string

          // 확장성을 위한 메타데이터
          metadata?: Record<string, any>

          // Timeline 관련 필드
          duration?: number
          audio_url?: string
          voice_over_url?: string
          voice_over_text?: string
          start_time?: number
          video_url?: string
          video_key?: string
          video_prompt?: string

          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          type: 'scene' | 'card' // 현재 시스템에 맞게 간소화
          title: string
          content: string
          user_input?: string
          image_urls?: string[]
          selected_image_url?: number

          // Storyboard 전용 필드
          scene_number?: number
          shot_type?: string
          angle?: string
          background?: string
          mood_lighting?: string
          dialogue?: string
          sound?: string
          image_prompt?: string
          storyboard_status?: string

          // 확장성을 위한 메타데이터
          metadata?: Record<string, any>

          // Timeline 관련 필드
          duration?: number
          audio_url?: string
          voice_over_url?: string
          voice_over_text?: string
          start_time?: number
          video_url?: string
          video_key?: string
          video_prompt?: string

          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          storyboard_id?: string
          user_id?: string
          type?: 'scene' | 'card' // 현재 시스템에 맞게 간소화
          title?: string
          content?: string
          user_input?: string
          image_urls?: string[]
          selected_image_url?: number
          width?: number
          height?: number
          order_index?: number

          // Storyboard 전용 필드
          scene_number?: number
          shot_type?: string
          angle?: string
          background?: string
          mood_lighting?: string
          dialogue?: string
          sound?: string
          image_prompt?: string
          storyboard_status?: string

          // 확장성을 위한 메타데이터
          metadata?: Record<string, any>

          // Timeline 관련 필드
          duration?: number
          audio_url?: string
          voice_over_url?: string
          voice_over_text?: string
          start_time?: number
          video_url?: string
          video_key?: string
          video_prompt?: string

          created_at?: string
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          user_id: string
          project_id?: string
          name: string
          description?: string
          edit_prompt?: string
          // R2 asset references
          image_url?: string
          image_key?: string
          image_size?: number
          image_content_type?: string
          // Original reference image
          original_image_url?: string
          original_image_key?: string
          original_image_size?: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string
          name: string
          description?: string
          edit_prompt?: string
          image_url?: string
          image_key?: string
          image_size?: number
          image_content_type?: string
          original_image_url?: string
          original_image_key?: string
          original_image_size?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          name?: string
          description?: string
          edit_prompt?: string
          image_url?: string
          image_key?: string
          image_size?: number
          image_content_type?: string
          original_image_url?: string
          original_image_key?: string
          original_image_size?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// 타입 편의성을 위한 별칭
export type SupabaseCard = Database['public']['Tables']['cards']['Row']
export type SupabaseCardInsert = Database['public']['Tables']['cards']['Insert']
export type SupabaseCardUpdate = Database['public']['Tables']['cards']['Update']

export type SupabaseCharacter = Database['public']['Tables']['characters']['Row']
export type SupabaseCharacterInsert = Database['public']['Tables']['characters']['Insert']
export type SupabaseCharacterUpdate = Database['public']['Tables']['characters']['Update']

export type SupabaseStoryboard = Database['public']['Tables']['storyboards']['Row']
export type SupabaseStoryboardInsert = Database['public']['Tables']['storyboards']['Insert']
export type SupabaseStoryboardUpdate = Database['public']['Tables']['storyboards']['Update']

export type SupabaseProject = Database['public']['Tables']['projects']['Row']
export type SupabaseProjectInsert = Database['public']['Tables']['projects']['Insert']
export type SupabaseProjectUpdate = Database['public']['Tables']['projects']['Update']

// Note: Using auth.users directly, no custom users table needed
// export type SupabaseUser = Database['public']['Tables']['users']['Row']
// export type SupabaseUserInsert = Database['public']['Tables']['users']['Insert']  
// export type SupabaseUserUpdate = Database['public']['Tables']['users']['Update']
