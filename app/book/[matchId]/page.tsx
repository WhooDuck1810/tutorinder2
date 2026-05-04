'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { useAuthStore } from '@/stores/authStore'
import { bookSession } from '@/app/api/calendar/book'
import { createClient } from '@/lib/supabase/client'
import type { Match, Profile, Booking } from '@/types/database'

type BookingState = 'idle' | 'loading' | 'success' | 'error'

export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string
  const { user } = useAuthStore()

  const [match, setMatch] = useState<Match | null>(null)
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [pastBookings, setPastBookings] = useState<Booking[]>([])
  const [isVerifying, setIsVerifying] = useState(true)

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingState, setBookingState] = useState<BookingState>('idle')
  const [result, setResult] = useState<{ meetLink: string; bookingId: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // ── Verify & load ──────────────────────────────────────────────────────────
  const verifyAndLoad = useCallback(async () => {
    if (!user) return
    const supabase = createClient()

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    const matchData = data as Match | null;
    if (error || !matchData || matchData.status !== 'accepted') {
      router.push('/dashboard')
      return
    }
    const isParticipant = matchData.student_id === user.id || matchData.teacher_id === user.id
    if (!isParticipant) { router.push('/dashboard'); return }

    setMatch(matchData)

    const otherId = matchData.student_id === user.id ? matchData.teacher_id : matchData.student_id
    const { data: other } = await supabase.from('profiles').select('*').eq('id', otherId).single()
    setOtherProfile(other)

    // Load past bookings for this match
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('match_id', matchId)
      .order('scheduled_time', { ascending: false })
      .limit(5)
    setPastBookings(bookings ?? [])

    setIsVerifying(false)
  }, [matchId, user, router])

  useEffect(() => { verifyAndLoad() }, [verifyAndLoad])

  // ── Min date = today ───────────────────────────────────────────────────────
  const minDate = new Date().toISOString().split('T')[0]

  // ── Submit booking ─────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return
    setBookingState('loading')
    setErrorMsg('')

    const scheduledTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString()
    const res = await bookSession(matchId, scheduledTime)

    if (res.success) {
      setResult({ meetLink: res.meetLink, bookingId: res.bookingId })
      setBookingState('success')
      verifyAndLoad() // refresh past bookings
    } else {
      setErrorMsg(res.error)
      setBookingState('error')
    }
  }

  // ── Suggested times ────────────────────────────────────────────────────────
  const suggestedTimes = ['09:00', '10:00', '14:00', '15:00', '16:00', '19:00', '20:00']

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isVerifying) {
    return (
      <div className="page-shell flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner" style={{ borderTopColor: '#00C0E8', width: '24px', height: '24px', borderWidth: '2.5px' }} />
        </div>
      </div>
    )
  }

  const otherInitials = otherProfile?.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <div className="page-shell">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link href={`/chat/${matchId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors fade-up"
          style={{ color: 'var(--muted)' }}>
          ← Back to chat
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 fade-up">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(0,192,232,0.12)', border: '1px solid rgba(0,192,232,0.3)', color: '#00C0E8' }}>
            {otherInitials}
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
              Book a Session
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              with {otherProfile?.full_name}
            </p>
          </div>
        </div>

        {/* ── Success state ── */}
        {bookingState === 'success' && result && (
          <div className="card mb-6 fade-up"
            style={{ border: '1px solid rgba(0,192,232,0.35)', background: 'rgba(0,192,232,0.05)' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1" style={{ color: '#00C0E8', fontFamily: 'var(--font-display)' }}>
                  Session booked!
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                  {new Date(`${selectedDate}T${selectedTime}`).toLocaleString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </p>
                <div className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: 'rgba(30,45,66,0.8)', border: '1px solid rgba(0,192,232,0.15)' }}>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>Meet link:</span>
                  <a href={result.meetLink} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium flex-1 truncate transition-colors"
                    style={{ color: '#00C0E8', fontFamily: 'var(--font-mono)' }}>
                    {result.meetLink}
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.meetLink)}
                    className="btn-ghost text-xs px-2 py-1">
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Booking form ── */}
        <div className="gradient-border fade-up-2">
          <div className="card p-7 rounded-2xl space-y-6">

            {/* Date picker */}
            <div>
              <label className="label">Select date</label>
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Time */}
            <div>
              <label className="label">Select time</label>
              {/* Quick-pick buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestedTimes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150"
                    style={selectedTime === t ? {
                      background: 'linear-gradient(135deg, rgba(0,192,232,0.2), rgba(238,131,200,0.15))',
                      border: '1px solid rgba(0,192,232,0.5)',
                      color: '#00C0E8',
                      fontFamily: 'var(--font-mono)',
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(0,192,232,0.12)',
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="input-field"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Error */}
            {bookingState === 'error' && (
              <p className="error-msg">{errorMsg}</p>
            )}

            {/* Summary */}
            {selectedDate && selectedTime && (
              <div className="px-4 py-3 rounded-xl text-sm fade-up"
                style={{ background: 'rgba(0,192,232,0.06)', border: '1px solid rgba(0,192,232,0.15)' }}>
                <span style={{ color: 'var(--muted)' }}>Booking for: </span>
                <span style={{ color: 'var(--text)' }}>
                  {new Date(`${selectedDate}T${selectedTime}`).toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={!selectedDate || !selectedTime || bookingState === 'loading'}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {bookingState === 'loading' ? (
                <>
                  <span className="spinner" />
                  Creating session link…
                </>
              ) : '📅 Confirm booking'}
            </button>
          </div>
        </div>

        {/* ── Past bookings ── */}
        {pastBookings.length > 0 && (
          <div className="mt-8 fade-up-3">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              Past sessions
            </h3>
            <div className="space-y-2">
              {pastBookings.map((b) => (
                <div key={b.id} className="card flex items-center gap-3 py-3 px-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(b.scheduled_time).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                    <a href={b.mock_meet_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs truncate block transition-colors"
                      style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {b.mock_meet_link}
                    </a>
                  </div>
                  <span className={`badge-${b.status}`}>{b.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}