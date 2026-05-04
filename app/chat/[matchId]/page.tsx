'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { ChatBubble } from '@/components/ChatBubble'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { createClient } from '@/lib/supabase/client'
import type { Match, Profile } from '@/types/database'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string

  const { user, profile } = useAuthStore()
  const { messages, isLoadingMessages, isSending, loadMessages, sendMessage, subscribeToMatch, unsubscribeFromMatch } = useChatStore()

  const [input, setInput] = useState('')
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Verify match access & load other profile ───────────────────────────────
  const verifyAndLoad = useCallback(async () => {
    if (!user) return
    const supabase = createClient()

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()
    const matchData = data as Match | null;
    if (error || !matchData) {
      router.push('/dashboard')
      return
    }

    const isParticipant = matchData.student_id === user.id || matchData.teacher_id === user.id
    if (!isParticipant || matchData.status !== 'accepted') {
      router.push('/dashboard')
      return
    }

    setMatch(matchData)

    const otherId = matchData.student_id === user.id ? matchData.teacher_id : matchData.student_id
    const { data: other } = await supabase.from('profiles').select('*').eq('id', otherId).single()
    setOtherProfile(other)
    setIsVerifying(false)
  }, [matchId, user, router])

  useEffect(() => {
    verifyAndLoad()
  }, [verifyAndLoad])

  // ── Load messages + subscribe to realtime ──────────────────────────────────
  useEffect(() => {
    if (isVerifying) return
    loadMessages(matchId)
    subscribeToMatch(matchId)
    return () => unsubscribeFromMatch()
  }, [isVerifying, matchId])

  // ── Auto-scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !user || isSending) return
    const content = input.trim()
    setInput('')
    await sendMessage(matchId, user.id, content)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isVerifying) {
    return (
      <div className="page-shell flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: 'var(--muted)' }}>
            <div className="spinner mx-auto mb-3" style={{ borderTopColor: '#00C0E8', width: '24px', height: '24px', borderWidth: '2.5px' }} />
            <p className="text-sm">Loading chat…</p>
          </div>
        </div>
      </div>
    )
  }

  const otherInitials = otherProfile?.full_name
    .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <div className="page-shell flex flex-col h-screen">
      <Navbar />

      {/* Chat container */}
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-4 min-h-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b fade-up"
          style={{ borderColor: 'rgba(0,192,232,0.1)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(238,131,200,0.12)', border: '1px solid rgba(238,131,200,0.3)', color: '#EE83C8' }}>
            {otherInitials}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {otherProfile?.full_name}
            </h2>
            <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>
              {otherProfile?.role} · {otherProfile?.subjects?.slice(0, 2).join(', ')}
            </p>
          </div>

          {/* Book session button */}
          {match && (
            <Link href={`/book/${match.id}`}
              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
              📅 Book session
            </Link>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32" style={{ color: 'var(--muted)' }}>
              <div className="spinner mx-auto" style={{ borderTopColor: '#00C0E8', width: '20px', height: '20px', borderWidth: '2px' }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center fade-up">
              <p className="text-3xl mb-2">👋</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                No messages yet. Say hello to {otherProfile?.full_name?.split(' ')[0]}!
              </p>
            </div>
          ) : (
            <div className="py-2">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isMine={msg.sender_id === user?.id}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="mt-4 flex gap-3 items-end fade-up">
          <div className="flex-1 rounded-2xl overflow-hidden"
            style={{ background: '#1e2d42', border: '1px solid rgba(0,192,232,0.18)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="w-full px-4 py-3 text-sm outline-none resize-none bg-transparent"
              style={{
                color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
                maxHeight: '120px',
                lineHeight: '1.5',
              }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="btn-primary px-4 py-3 shrink-0 flex items-center justify-center"
            style={{ minWidth: '52px', borderRadius: '16px' }}>
            {isSending
              ? <span className="spinner" />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
      </div>
    </div>
  )
}