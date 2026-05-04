'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Message, Match, Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatState {
  // State
  activeMatch: (Match & { other_profile: Profile }) | null
  messages: Message[]
  isLoadingMessages: boolean
  isSending: boolean
  channel: RealtimeChannel | null

  // Actions
  setActiveMatch: (match: (Match & { other_profile: Profile }) | null) => void

  // Async actions
  loadMessages: (matchId: string) => Promise<void>
  sendMessage: (matchId: string, senderId: string, content: string) => Promise<{ error: string | null }>
  subscribeToMatch: (matchId: string) => void
  unsubscribeFromMatch: () => void
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      activeMatch: null,
      messages: [],
      isLoadingMessages: false,
      isSending: false,
      channel: null,

      setActiveMatch: (match) =>
        set({ activeMatch: match }, false, 'setActiveMatch'),

      /**
       * loadMessages — fetches the last 100 messages for a match, ordered oldest first.
       */
      loadMessages: async (matchId: string) => {
        set({ isLoadingMessages: true }, false, 'loadMessages:start')
        const supabase = createClient()

        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true })
          .limit(100)

        if (!error && data) {
          set({ messages: data }, false, 'loadMessages:success')
        }

        set({ isLoadingMessages: false }, false, 'loadMessages:end')
      },

      /**
       * sendMessage — inserts a new message row.
       * Supabase Realtime will push it back via the subscription,
       * so we do NOT optimistically append here — avoids duplicates.
       */
      sendMessage: async (matchId: string, senderId: string, content: string) => {
        if (!content.trim()) return { error: 'Message cannot be empty' }

        set({ isSending: true }, false, 'sendMessage:start')
        const supabase = createClient()

        const { error } = await supabase.from('messages').insert({
          match_id: matchId,
          sender_id: senderId,
          content: content.trim(),
        })

        set({ isSending: false }, false, 'sendMessage:end')

        if (error) return { error: error.message }
        return { error: null }
      },

      /**
       * subscribeToMatch — opens a Supabase Realtime channel on the messages table
       * filtered to this match_id. New INSERT events are appended to state.
       *
       * Call this when the user opens a chat thread.
       * Call unsubscribeFromMatch() when they leave.
       */
      subscribeToMatch: (matchId: string) => {
        // Clean up any existing subscription first
        get().unsubscribeFromMatch()

        const supabase = createClient()

        const channel = supabase
          .channel(`chat:${matchId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `match_id=eq.${matchId}`,
            },
            (payload) => {
              const newMessage = payload.new as Message

              set(
                (state) => ({
                  // Deduplicate — in case we somehow get a duplicate
                  messages: state.messages.some((m) => m.id === newMessage.id)
                    ? state.messages
                    : [...state.messages, newMessage],
                }),
                false,
                'realtime:newMessage'
              )
            }
          )
          .subscribe()

        set({ channel }, false, 'subscribeToMatch')
      },

      /**
       * unsubscribeFromMatch — removes the Realtime channel subscription.
       */
      unsubscribeFromMatch: () => {
        const { channel } = get()
        if (channel) {
          const supabase = createClient()
          supabase.removeChannel(channel)
          set({ channel: null, messages: [] }, false, 'unsubscribeFromMatch')
        }
      },
    }),
    { name: 'ChatStore' }
  )
)
