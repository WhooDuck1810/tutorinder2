'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── Validation schema ─────────────────────────────────────────────────────────

const BookingSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  scheduledTime: z
    .string()
    .datetime({ message: 'Invalid ISO 8601 datetime' })
    .refine(
      (val) => new Date(val) > new Date(),
      'Scheduled time must be in the future'
    ),
})

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BookingResult =
  | { success: true; meetLink: string; bookingId: string }
  | { success: false; error: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * generateMockMeetLink — produces a realistic-looking Google Meet link.
 * Format: meet.google.com/[abc]-[defg]-[hij]
 */
function generateMockMeetLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  return `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`
}

/**
 * simulateNetworkDelay — mimics a real calendar API round-trip.
 */
function simulateNetworkDelay(ms = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Server Action ─────────────────────────────────────────────────────────────

/**
 * bookSession — Mock Calendar Server Action.
 *
 * 1. Validates input with Zod
 * 2. Checks the caller is authenticated and a participant in the match
 * 3. Simulates a 1-second network delay
 * 4. Generates a dummy meet.google.com link
 * 5. Inserts a booking row into Supabase
 * 6. Returns the meet link and booking ID on success
 *
 * Used by: /app/book/[matchId]/page.tsx (Step 3)
 */
export async function bookSession(
  matchId: string,
  scheduledTime: string
): Promise<BookingResult> {
  // ── 1. Validate input ──────────────────────────────────────────────────────
  const parsed = BookingSchema.safeParse({ matchId, scheduledTime })

  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(', ')
    return { success: false, error: message }
  }

  // ── 2. Auth check ──────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to book a session.' }
  }

  // ── 3. Verify caller is a participant in the match ─────────────────────────
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, student_id, teacher_id, status')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    return { success: false, error: 'Match not found.' }
  }

  const matchData = match as { student_id: string; teacher_id: string; status: string };

  const isParticipant =
    matchData.student_id === user.id || matchData.teacher_id === user.id

  if (!isParticipant) {
    return { success: false, error: 'You are not a participant in this match.' }
  }
  
  if (matchData.status !== 'accepted') {
    return {
      success: false,
      error: 'Sessions can only be booked for accepted matches.',
    }
  }

  // ── 4. Simulate network delay (mock calendar API) ──────────────────────────
  await simulateNetworkDelay(1000)

  // ── 5. Generate mock meet link ─────────────────────────────────────────────
  const mockMeetLink = generateMockMeetLink()

  // ── 6. Insert booking record ───────────────────────────────────────────────
  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      match_id: matchId,
      scheduled_time: scheduledTime,
      mock_meet_link: mockMeetLink,
      status: 'confirmed',
    } as any)
    .select('id')
    .single()

  if (insertError || !booking) {
    console.error('[bookSession] Insert error:', insertError)
    return {
      success: false,
      error: 'Failed to save the booking. Please try again.',
    }
  }

  // ── 7. Return success ──────────────────────────────────────────────────────
  return {
    success: true,
    meetLink: mockMeetLink,
    bookingId: (booking as any).id,
  }
}
