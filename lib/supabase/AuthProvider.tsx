'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

/**
 * AuthProvider — mounts once in the root layout (as a Client Component wrapper).
 * Calls initialize() which hydrates the Zustand auth store from the existing
 * Supabase session and sets up the onAuthStateChange listener.
 *
 * Usage in app/layout.tsx:
 *   <AuthProvider>{children}</AuthProvider>
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  return <>{children}</>
}
