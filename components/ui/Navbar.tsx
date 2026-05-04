'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b"
      style={{ background: 'rgba(24,33,49,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,192,232,0.12)' }}>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#182131] font-bold text-sm"
          style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg,#00C0E8,#EE83C8)' }}>
          T
        </div>
        <span className="font-bold text-base gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
          Tutorinder
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden sm:flex items-center gap-6">
        <Link href="/dashboard"
          className={`nav-link text-sm ${pathname === '/dashboard' ? 'active' : ''}`}>
          Discover
        </Link>
        {profile?.role === 'student' && (
          <Link href="/dashboard?tab=matches" className="nav-link text-sm">
            My Matches
          </Link>
        )}
        {profile?.role === 'teacher' && (
          <Link href="/dashboard?tab=requests" className="nav-link text-sm">
            Requests
          </Link>
        )}
      </div>

      {/* Right: avatar (links to /profile) + sign out */}
      <div className="flex items-center gap-3">
        <Link href="/profile" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg,rgba(0,192,232,0.2),rgba(238,131,200,0.2))',
              border: '1px solid rgba(0,192,232,0.3)',
              color: '#00C0E8',
            }}>
            {initials}
          </div>
          <span className="hidden sm:block text-sm transition-colors"
            style={{ color: 'var(--muted)' }}>
            {profile?.full_name?.split(' ')[0] ?? ''}
          </span>
        </Link>
        <button onClick={handleSignOut} className="btn-ghost text-xs px-3 py-1.5">
          Sign out
        </button>
      </div>
    </nav>
  )
}