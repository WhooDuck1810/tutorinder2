'use client'

import Link from 'next/link'
import type { Profile } from '@/types/database'
import type { MatchResult } from '@/lib/matching'

interface TeacherCardProps {
  teacher: Profile
  matchStatus?: 'pending' | 'accepted' | 'rejected' | 'completed' | null
  matchId?: string
  matchResult?: MatchResult // <-- Prop mới thêm vào
  onConnect?: (teacherId: string) => void
  isConnecting?: boolean
}

export function TeacherCard({ teacher, matchStatus, matchId, matchResult, onConnect, isConnecting }: TeacherCardProps) {
  const initials = teacher.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const hue = teacher.id.charCodeAt(0) % 2 === 0 ? 'cyan' : 'pink'
  const hasBlockers = matchResult && matchResult.blockers.length > 0

  return (
    <div className={`card-hover group flex flex-col gap-4 ${hasBlockers ? 'opacity-70 grayscale-[20%]' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
          style={hue === 'cyan'
            ? { background: 'rgba(0,192,232,0.12)', border: '1px solid rgba(0,192,232,0.3)', color: '#00C0E8' }
            : { background: 'rgba(238,131,200,0.12)', border: '1px solid rgba(238,131,200,0.3)', color: '#EE83C8' }
          }>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
            {teacher.full_name}
          </h3>
          {teacher.hourly_rate && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              ${teacher.hourly_rate.toFixed(0)}<span style={{ color: 'rgba(139,175,200,0.5)' }}>/hr</span>
            </p>
          )}
        </div>

        {/* ── Match Score Badge ── */}
        {matchResult && (
          <div className="shrink-0 text-xs font-bold px-2 py-1 rounded-lg border flex flex-col items-end"
            style={{
              background: hasBlockers ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              borderColor: hasBlockers ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              color: hasBlockers ? '#EF4444' : '#10B981'
            }}>
            <span>{matchResult.score}% Match</span>
          </div>
        )}
        
        {matchStatus && !matchResult && (
          <span className={`badge-${matchStatus} shrink-0`}>{matchStatus}</span>
        )}
      </div>

      {/* ── Match Reasons / Blockers ── */}
      {matchResult && (
        <div className="text-xs space-y-1 mt-1">
          {hasBlockers ? (
            <p style={{ color: '#EF4444' }}>⚠️ {matchResult.blockers[0]}</p>
          ) : matchResult.reasons.length > 0 ? (
            <p style={{ color: '#10B981' }}>✓ {matchResult.reasons[0]}</p>
          ) : null}
        </div>
      )}

      {/* Bio */}
      {teacher.bio && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--muted)' }}>{teacher.bio}</p>
      )}

      {/* Subjects */}
      {teacher.subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {teacher.subjects.slice(0, 4).map((s) => (
            <span key={s} className="subject-pill">{s}</span>
          ))}
          {teacher.subjects.length > 4 && (
            <span className="subject-pill" style={{ opacity: 0.6 }}>+{teacher.subjects.length - 4}</span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mt-auto pt-2 border-t flex gap-2" style={{ borderColor: 'rgba(0,192,232,0.08)' }}>
        {matchStatus === 'accepted' && matchId ? (
          <>
            <Link href={`/chat/${matchId}`} className="btn-primary text-xs px-3 py-2 flex-1 text-center">Open chat</Link>
            <Link href={`/book/${matchId}`} className="btn-ghost text-xs px-3 py-2 flex-1 text-center">Book session</Link>
          </>
        ) : matchStatus === 'pending' ? (
          <button disabled className="btn-ghost text-xs px-3 py-2 w-full opacity-50 cursor-not-allowed">Request sent</button>
        ) : matchStatus === 'rejected' ? (
          <button disabled className="btn-ghost text-xs px-3 py-2 w-full opacity-40 cursor-not-allowed">Not accepted</button>
        ) : (
          <button
            onClick={() => onConnect?.(teacher.id)}
            disabled={isConnecting || hasBlockers}
            className="btn-primary text-xs px-3 py-2 w-full flex items-center justify-center gap-1.5"
            style={hasBlockers ? { background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' } : {}}>
            {isConnecting ? <><span className="spinner" />Connecting…</> : hasBlockers ? 'Incompatible' : 'Connect →'}
          </button>
        )}
      </div>
    </div>
  )
}