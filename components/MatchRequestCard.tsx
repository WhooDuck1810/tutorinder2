'use client'

import Link from 'next/link'
import type { Match, Profile } from '@/types/database'
import type { MatchResult } from '@/lib/matching'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface MatchRequestCardProps {
  match: Match & { student: Profile }
  matchResult?: MatchResult // <-- Prop mới thêm vào
  onStatusChange?: () => void
}

export function MatchRequestCard({ match, matchResult, onStatusChange }: MatchRequestCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { student } = match

  const initials = student.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const hasBlockers = matchResult && matchResult.blockers.length > 0

  const updateStatus = async (status: 'accepted' | 'rejected') => {
    setIsUpdating(true)
    const supabase = createClient()
    await supabase.from('matches').update({ status }).eq('id', match.id)
    setIsUpdating(false)
    onStatusChange?.()
  }

  return (
    <div className={`card flex items-center gap-4 ${hasBlockers ? 'opacity-80' : ''}`}>
      {/* Avatar */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: 'rgba(238,131,200,0.12)', border: '1px solid rgba(238,131,200,0.25)', color: '#EE83C8' }}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{student.full_name}</p>
          {matchResult && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
              style={{
                background: hasBlockers ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: hasBlockers ? '#EF4444' : '#10B981'
              }}>
              {matchResult.score}% Fit
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`badge-${match.status}`}>{match.status}</span>
          {student.subjects?.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {student.subjects.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
        {hasBlockers && (
           <p className="text-xs mt-1" style={{ color: '#EF4444' }}>⚠️ {matchResult.blockers[0]}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        {match.status === 'pending' ? (
          <>
            <button onClick={() => updateStatus('accepted')} disabled={isUpdating} className="btn-primary text-xs px-3 py-1.5">
              {isUpdating ? <span className="spinner" /> : 'Accept'}
            </button>
            <button onClick={() => updateStatus('rejected')} disabled={isUpdating} className="btn-ghost text-xs px-3 py-1.5">
              Decline
            </button>
          </>
        ) : match.status === 'accepted' ? (
          <Link href={`/chat/${match.id}`} className="btn-primary text-xs px-3 py-1.5">Chat</Link>
        ) : (
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Declined</span>
        )}
      </div>
    </div>
  )
}