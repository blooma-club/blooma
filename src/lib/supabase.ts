import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          description?: string
          is_public: boolean
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
          storyboard_id: string
          user_id: string
          type: 'hook' | 'problem' | 'solution' | 'evidence' | 'benefit' | 'cta'
          title: string
          content: string
          image_urls?: string[]
          selected_image_url?: number
          position_x: number
          position_y: number
          width: number
          height: number
          // Styling is now hardcoded for consistency
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          storyboard_id: string
          user_id: string
          type: 'hook' | 'problem' | 'solution' | 'evidence' | 'benefit' | 'cta'
          title: string
          content: string
          image_urls?: string[]
          selected_image_url?: number
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          // Styling is now hardcoded for consistency
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          storyboard_id?: string
          user_id?: string
          type?: 'hook' | 'problem' | 'solution' | 'evidence' | 'benefit' | 'cta'
          title?: string
          content?: string
          image_urls?: string[]
          selected_image_url?: number
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          // Styling is now hardcoded for consistency
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
