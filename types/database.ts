/**
 * Database types for Tutorinder — v2
 * Updated: adds all matching fields to profiles.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

/** { "Mathematics": 3.5, "Physics": 3.2 } */
export type GpaMap = Record<string, number>

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'student' | 'teacher'
          full_name: string
          avatar_url: string | null
          bio: string | null
          subjects: string[]
          timezone: string
          created_at: string
          updated_at: string
          // Shared matching
          learning_mode: 'online' | 'offline' | 'both'
          location: string | null
          special_needs: string[]
          // Student-only
          max_budget: number | null
          gpa_per_subject: GpaMap
          // Teacher-only
          hourly_rate: number | null
          min_gpa_per_subject: GpaMap
          years_experience: number | null
          certifications: string | null
        }
        Insert: {
          id: string
          role: 'student' | 'teacher'
          full_name: string
          avatar_url?: string | null
          bio?: string | null
          subjects?: string[]
          timezone?: string
          created_at?: string
          updated_at?: string
          learning_mode?: 'online' | 'offline' | 'both'
          location?: string | null
          special_needs?: string[]
          max_budget?: number | null
          gpa_per_subject?: GpaMap
          hourly_rate?: number | null
          min_gpa_per_subject?: GpaMap
          years_experience?: number | null
          certifications?: string | null
        }
        Update: {
          role?: 'student' | 'teacher'
          full_name?: string
          avatar_url?: string | null
          bio?: string | null
          subjects?: string[]
          timezone?: string
          updated_at?: string
          learning_mode?: 'online' | 'offline' | 'both'
          location?: string | null
          special_needs?: string[]
          max_budget?: number | null
          gpa_per_subject?: GpaMap
          hourly_rate?: number | null
          min_gpa_per_subject?: GpaMap
          years_experience?: number | null
          certifications?: string | null
        }
      }

      matches: {
        Row: {
          id: string
          student_id: string
          teacher_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          teacher_id: string
          status?: 'pending' | 'accepted' | 'rejected' | 'completed'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'rejected' | 'completed'
        }
      }

      messages: {
        Row: {
          id: string
          match_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: never
      }

      bookings: {
        Row: {
          id: string
          match_id: string
          scheduled_time: string
          mock_meet_link: string
          status: 'confirmed' | 'cancelled' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          scheduled_time: string
          mock_meet_link: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          created_at?: string
        }
        Update: {
          status?: 'confirmed' | 'cancelled' | 'completed'
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─── Convenience aliases ───────────────────────────────────────────────────────
export type Profile       = Database['public']['Tables']['profiles']['Row']
export type Match         = Database['public']['Tables']['matches']['Row']
export type Message       = Database['public']['Tables']['messages']['Row']
export type Booking       = Database['public']['Tables']['bookings']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type MatchInsert   = Database['public']['Tables']['matches']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']

// ─── Matching constants ────────────────────────────────────────────────────────
export const SPECIAL_NEEDS_OPTIONS = [
  'ADHD', 'Dyslexia', 'Autism', 'Dyscalculia',
  'Visual impairment', 'Hearing impairment', 'Anxiety', 'Other',
] as const

export type SpecialNeed = typeof SPECIAL_NEEDS_OPTIONS[number]
export type LearningMode = 'online' | 'offline' | 'both'