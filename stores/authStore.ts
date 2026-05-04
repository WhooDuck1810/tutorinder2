'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  // State
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void

  // Async actions
  initialize: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>
  signIn: (params: SignInParams) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

interface SignUpParams {
  email: string
  password: string
  fullName: string
  role: 'student' | 'teacher'
}

interface SignInParams {
  email: string
  password: string
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isInitialized: false,

      setUser: (user) => set({ user }, false, 'setUser'),
      setSession: (session) => set({ session }, false, 'setSession'),
      setProfile: (profile) => set({ profile }, false, 'setProfile'),
      setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),

      /**
       * initialize — call once in a top-level Client Component (e.g. AuthProvider).
       * Hydrates state from Supabase session and subscribes to auth changes.
       */
      initialize: async () => {
        const supabase = createClient()

        // Get existing session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          set({ session, user: session.user })
          await get().fetchProfile(session.user.id)
        }

        set({ isInitialized: true })

        // Subscribe to auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          set({ session, user: session?.user ?? null })

          if (session?.user) {
            await get().fetchProfile(session.user.id)
          } else {
            set({ profile: null })
          }
        })
      },

      /**
       * fetchProfile — loads the profiles row for a given userId.
       */
      fetchProfile: async (userId: string) => {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          set({ profile: data }, false, 'fetchProfile')
        }
      },

      /**
       * signUp — creates a new Supabase auth user.
       * The handle_new_user() trigger will auto-create the profiles row.
       */
      signUp: async ({ email, password, fullName, role }) => {
        set({ isLoading: true })
        const supabase = createClient()

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
          },
        })

        set({ isLoading: false })

        if (error) return { error: error.message }
        return { error: null }
      },

      /**
       * signIn — email/password login.
       */
      signIn: async ({ email, password }) => {
        set({ isLoading: true })
        const supabase = createClient()

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        set({ isLoading: false })

        if (error) return { error: error.message }
        return { error: null }
      },

      /**
       * signOut — clears all auth state.
       */
      signOut: async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        set({ user: null, session: null, profile: null }, false, 'signOut')
      },
    }),
    { name: 'AuthStore' }
  )
)
