'use client'
import Link from 'next/link'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { TeacherCard } from '@/components/TeacherCard'
import { MatchRequestCard } from '@/components/MatchRequestCard'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { calculateMatch } from '@/lib/matching' // <-- Import Engine
import type { Profile, Match } from '@/types/database'

type MatchWithStudent = Match & { student: Profile }
type MatchWithTeacher = Match & { teacher: Profile }

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? (useAuthStore.getState().profile?.role === 'teacher' ? 'requests' : 'discover')

  const { profile } = useAuthStore()
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [myMatches, setMyMatches] = useState<MatchWithTeacher[]>([])
  const [requests, setRequests] = useState<MatchWithStudent[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [tab, setTab] = useState(activeTab)

  const supabase = createClient()

  const loadTeachers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'teacher')
    setTeachers(data ?? [])
  }, [])

  const loadMyMatches = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('matches').select('*, teacher:teacher_id(*)').eq('student_id', profile.id)
    setMyMatches((data as MatchWithTeacher[]) ?? [])
  }, [profile])

  const loadRequests = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('matches').select('*, student:student_id(*)').eq('teacher_id', profile.id)
    setRequests((data as MatchWithStudent[]) ?? [])
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const init = async () => {
      setIsLoading(true)
      if (profile.role === 'student') await Promise.all([loadTeachers(), loadMyMatches()])
      else await loadRequests()
      setIsLoading(false)
    }
    init()
  }, [profile, loadTeachers, loadMyMatches, loadRequests])

  const handleConnect = async (teacherId: string) => {
    if (!profile) return
    setConnectingId(teacherId)
    await supabase.from('matches').insert({ student_id: profile.id, teacher_id: teacherId, status: 'pending' } as any)
    await loadMyMatches()
    setConnectingId(null)
  }

  const getMatchForTeacher = (teacherId: string) => myMatches.find((m) => m.teacher_id === teacherId)

  // ── Matching Logic applied to Teachers ──
  const sortedAndFilteredTeachers = useMemo(() => {
    if (!profile) return []
    return teachers
      .filter((t) => {
        if (!search) return true
        const q = search.toLowerCase()
        return t.full_name.toLowerCase().includes(q) || t.subjects.some((s) => s.toLowerCase().includes(q))
      })
      .map((t) => ({ teacher: t, matchResult: calculateMatch(profile, t) }))
      .sort((a, b) => {
        const aHasBlocker = a.matchResult.blockers.length > 0
        const bHasBlocker = b.matchResult.blockers.length > 0
        if (!aHasBlocker && bHasBlocker) return -1
        if (aHasBlocker && !bHasBlocker) return 1
        return b.matchResult.score - a.matchResult.score // Sort by score DESC
      })
  }, [teachers, profile, search])

  // ── Matching Logic applied to Requests ──
  const sortedRequests = useMemo(() => {
    if (!profile) return []
    return requests
      .map((req) => ({ req, matchResult: calculateMatch(req.student, profile) }))
      .sort((a, b) => {
        if (a.req.status === 'pending' && b.req.status !== 'pending') return -1
        if (a.req.status !== 'pending' && b.req.status === 'pending') return 1
        return b.matchResult.score - a.matchResult.score
      })
  }, [requests, profile])

  return (
    <div className="page-shell">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 fade-up">
          <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
            {profile?.role === 'teacher' ? 'Student Requests' : 'Find Your Tutor'}
          </h1>
        </div>

        {/* ── STUDENT VIEW ── */}
        {profile?.role === 'student' && (
          <>
            <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit fade-up-2" style={{ background: 'rgba(30,45,66,0.8)', border: '1px solid rgba(0,192,232,0.1)' }}>
              {(['discover', 'matches'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200"
                  style={tab === t ? { background: 'linear-gradient(135deg, rgba(0,192,232,0.18), rgba(238,131,200,0.18))', color: '#00C0E8' } : { color: 'var(--muted)', background: 'transparent' }}>
                  {t === 'discover' ? '🔍 Discover' : `💬 My Matches ${myMatches.length > 0 ? `(${myMatches.length})` : ''}`}
                </button>
              ))}
            </div>

            {tab === 'discover' && (
              <>
                <div className="mb-6 fade-up-2">
                  <input type="text" placeholder="Search by name, subject, or keyword…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-sm" />
                </div>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="card h-52 animate-pulse" style={{ background: 'rgba(30,45,66,0.5)' }} />)}
                  </div>
                ) : sortedAndFilteredTeachers.length === 0 ? (
                  <div className="text-center py-16 text-muted"><p className="text-4xl mb-3">🔍</p><p className="text-sm">No teachers found.</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-up-3">
                    {sortedAndFilteredTeachers.map(({ teacher, matchResult }) => {
                      const match = getMatchForTeacher(teacher.id)
                      return (
                        <TeacherCard key={teacher.id} teacher={teacher} matchStatus={match?.status ?? null} matchId={match?.id}
                          matchResult={matchResult} onConnect={handleConnect} isConnecting={connectingId === teacher.id} />
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {tab === 'matches' && (
              <div className="space-y-3 fade-up-2">
                {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse" style={{ background: 'rgba(30,45,66,0.5)' }} />)
                : myMatches.length === 0 ? <div className="text-center py-16 text-muted"><p className="text-4xl mb-3">📭</p><p className="text-sm">No matches yet.</p></div>
                : myMatches.map((match) => (
                    <div key={match.id} className="card flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{(match.teacher as Profile).full_name}</p>
                        <div className="flex gap-2 mt-1 flex-wrap"><span className={`badge-${match.status}`}>{match.status}</span></div>
                      </div>
                      {match.status === 'accepted' && (
                        <div className="flex gap-2"><Link href={`/chat/${match.id}`} className="btn-primary text-xs px-3 py-1.5">Chat</Link><Link href={`/book/${match.id}`} className="btn-ghost text-xs px-3 py-1.5">Book</Link></div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* ── TEACHER VIEW ── */}
        {profile?.role === 'teacher' && (
          <div className="space-y-3 fade-up-2">
            {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse" style={{ background: 'rgba(30,45,66,0.5)' }} />)
            : sortedRequests.length === 0 ? <div className="text-center py-16 text-muted"><p className="text-4xl mb-3">📬</p><p className="text-sm">No requests yet.</p></div>
            : sortedRequests.map(({ req, matchResult }) => (
                <MatchRequestCard key={req.id} match={req} matchResult={matchResult} onStatusChange={loadRequests} />
              ))}
          </div>
        )}
      </main>
    </div>
  )
}