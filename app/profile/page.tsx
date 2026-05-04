'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navbar } from '@/components/ui/Navbar'
import { SubjectTagInput } from '@/components/ui/SubjectTagInput'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { SPECIAL_NEEDS_OPTIONS, type GpaMap } from '@/types/database'

// ─── Zod schema ────────────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  full_name:        z.string().min(2, 'Name must be at least 2 characters'),
  bio:              z.string().max(400, 'Bio must be under 400 characters').optional(),
  timezone:         z.string().min(1, 'Select a timezone'),
  learning_mode:    z.enum(['online', 'offline', 'both']),
  location:         z.string().optional(),
  // Student
  max_budget:       z.string().optional(),
  // Teacher
  hourly_rate:      z.string().optional(),
  years_experience: z.string().optional(),
  certifications:   z.string().optional(),
})

type ProfileForm = z.infer<typeof ProfileSchema>

const TIMEZONES = [
  'UTC', 'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Kolkata',
  'Europe/London', 'Europe/Paris', 'America/New_York',
  'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Australia/Sydney',
]

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// ─── GPA row editor ────────────────────────────────────────────────────────────
function GpaEditor({
  subjects,
  gpaMap,
  onChange,
  label,
  hint,
}: {
  subjects: string[]
  gpaMap: GpaMap
  onChange: (map: GpaMap) => void
  label: string
  hint: string
}) {
  if (subjects.length === 0)
    return (
      <p className="text-xs italic" style={{ color: 'rgba(139,175,200,0.5)' }}>
        Add subjects above first.
      </p>
    )

  return (
    <div className="space-y-2">
      <p className="text-xs mb-1" style={{ color: 'rgba(139,175,200,0.6)', fontFamily: 'var(--font-mono)' }}>
        {hint}
      </p>
      {subjects.map((subject) => (
        <div key={subject} className="flex items-center gap-3">
          <span
            className="text-xs min-w-[130px] truncate"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
            {subject}
          </span>
          <input
            type="number"
            min="0"
            max="4"
            step="0.1"
            placeholder="0.0"
            value={gpaMap[subject] ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              const next = { ...gpaMap }
              if (isNaN(val)) {
                delete next[subject]
              } else {
                next[subject] = Math.min(4.0, Math.max(0, val))
              }
              onChange(next)
            }}
            className="input-field w-24 text-center py-2 text-sm"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <span className="text-xs" style={{ color: 'rgba(139,175,200,0.4)' }}>/ 4.0</span>
        </div>
      ))}
    </div>
  )
}

// ─── Special needs multi-select ────────────────────────────────────────────────
function SpecialNeedsSelect({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])

  return (
    <div className="flex flex-wrap gap-2">
      {SPECIAL_NEEDS_OPTIONS.map((opt) => {
        const active = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="text-xs px-3 py-1.5 rounded-full transition-all duration-150"
            style={
              active
                ? {
                    background: 'rgba(238,131,200,0.15)',
                    border: '1px solid rgba(238,131,200,0.5)',
                    color: '#EE83C8',
                    fontFamily: 'var(--font-mono)',
                  }
                : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(0,192,232,0.12)',
                    color: 'var(--muted)',
                    fontFamily: 'var(--font-mono)',
                  }
            }>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  // Lấy thêm isInitialized và đổi tên profile gốc từ store thành storeProfile
  const { profile: storeProfile, fetchProfile, user, isInitialized } = useAuthStore()

  // Tạo dữ liệu dự phòng từ metadata (sử dụng useMemo để tránh re-render vô tận)
  const profile = useMemo(() => {
    if (storeProfile) return storeProfile;
    if (user) {
      return {
        role: user.user_metadata?.role || 'student',
        full_name: user.user_metadata?.full_name || '',
        subjects: [],
        created_at: new Date().toISOString(),
      } as any;
    }
    return null;
  }, [storeProfile, user])

  // Multi-value state (not in react-hook-form)
  const [subjects, setSubjects] = useState<string[]>([])
  const [specialNeeds, setSpecialNeeds] = useState<string[]>([])
  const [gpaMap, setGpaMap] = useState<GpaMap>({})          // student
  const [minGpaMap, setMinGpaMap] = useState<GpaMap>({})    // teacher

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [charCount, setCharCount] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      full_name:        '',
      bio:              '',
      timezone:         'Asia/Ho_Chi_Minh',
      learning_mode:    'online',
      location:         '',
      max_budget:       '',
      hourly_rate:      '',
      years_experience: '',
      certifications:   '',
    },
  })

  const bioValue = watch('bio') ?? ''
  const learningMode = watch('learning_mode')

  // ── Hydrate from Supabase profile ──────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    reset({
      full_name:        profile.full_name,
      bio:              profile.bio ?? '',
      timezone:         profile.timezone ?? 'Asia/Ho_Chi_Minh',
      learning_mode:    profile.learning_mode ?? 'online',
      location:         profile.location ?? '',
      max_budget:       profile.max_budget?.toString() ?? '',
      hourly_rate:      profile.hourly_rate?.toString() ?? '',
      years_experience: profile.years_experience?.toString() ?? '',
      certifications:   profile.certifications ?? '',
    })
    setSubjects(profile.subjects ?? [])
    setSpecialNeeds(profile.special_needs ?? [])
    setGpaMap((profile.gpa_per_subject as GpaMap) ?? {})
    setMinGpaMap((profile.min_gpa_per_subject as GpaMap) ?? {})
    setCharCount((profile.bio ?? '').length)
  }, [profile, reset])

  useEffect(() => {
    setCharCount(bioValue.length)
  }, [bioValue])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProfileForm) => {
    if (!user) return
    setSaveState('saving')
    setSaveError('')

    const supabase = createClient()

    const payload: Record<string, unknown> = {
      full_name:      data.full_name,
      bio:            data.bio || null,
      timezone:       data.timezone,
      learning_mode:  data.learning_mode,
      location:       data.location || null,
      subjects,
      special_needs:  specialNeeds,
      updated_at:     new Date().toISOString(),
    }

    if (profile?.role === 'student') {
      payload.max_budget       = data.max_budget ? parseFloat(data.max_budget) : null
      payload.gpa_per_subject  = gpaMap
    }

    if (profile?.role === 'teacher') {
      payload.hourly_rate          = data.hourly_rate ? parseFloat(data.hourly_rate) : null
      payload.min_gpa_per_subject  = minGpaMap
      payload.years_experience     = data.years_experience ? parseInt(data.years_experience) : null
      payload.certifications       = data.certifications || null
    }

    // Dùng upsert thay vì update để chèn mới data nếu tài khoản chưa từng tạo profile
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        role: profile.role,
        ...payload
      })

    if (error) {
      setSaveError(error.message)
      setSaveState('error')
      return
    }

    await fetchProfile(user.id)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2500)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  // Kiểm tra isInitialized để tránh chớp giật giao diện
  if (!isInitialized || !profile) {
    return (
      <div className="page-shell flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner" style={{ borderTopColor: '#00C0E8', width: '24px', height: '24px', borderWidth: '2.5px' }} />
        </div>
      </div>
    )
  }

  const initials = profile.full_name
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  const needsLocation = learningMode === 'offline' || learningMode === 'both'

  return (
    <div className="page-shell">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8 fade-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0,192,232,0.15), rgba(238,131,200,0.15))',
              border: '1px solid rgba(0,192,232,0.3)',
              color: '#00C0E8',
              fontFamily: 'var(--font-display)',
            }}>
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
              Edit Profile
            </h1>
            <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--muted)' }}>
              {profile.role} · {profile.subjects?.slice(0, 2).join(', ') || 'No subjects yet'}
            </p>
          </div>
        </div>

        {/* ── Save banners ── */}
        {saveState === 'saved' && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 fade-up"
            style={{ background: 'rgba(0,192,232,0.08)', border: '1px solid rgba(0,192,232,0.3)', color: '#00C0E8' }}>
            ✓ Profile saved successfully
          </div>
        )}
        {saveState === 'error' && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm fade-up"
            style={{ background: 'rgba(238,131,200,0.08)', border: '1px solid rgba(238,131,200,0.3)', color: '#EE83C8' }}>
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 fade-up-2">

          {/* ── CARD 1: Basic info ── */}
          <div className="gradient-border">
            <div className="card p-7 rounded-2xl space-y-5">
              <h2 className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Basic info
              </h2>

              {/* Full name */}
              <div>
                <label className="label">Full name</label>
                <input type="text"
                  className={`input-field ${errors.full_name ? 'error' : ''}`}
                  {...register('full_name')} />
                {errors.full_name && <p className="error-msg">{errors.full_name.message}</p>}
              </div>

              {/* Bio */}
              <div>
                <label className="label">
                  {profile.role === 'teacher' ? 'Bio / teaching philosophy' : 'Bio / learning goals'}
                  <span className="ml-auto float-right"
                    style={{ color: charCount > 380 ? '#EE83C8' : 'rgba(139,175,200,0.5)' }}>
                    {charCount}/400
                  </span>
                </label>
                <textarea rows={4}
                  placeholder={
                    profile.role === 'teacher'
                      ? 'Describe your teaching style, experience, and what students can expect…'
                      : 'Tell tutors about yourself and your learning goals…'
                  }
                  className={`input-field resize-none ${errors.bio ? 'error' : ''}`}
                  style={{ lineHeight: '1.6' }}
                  {...register('bio')} />
                {errors.bio && <p className="error-msg">{errors.bio.message}</p>}
              </div>

              {/* Timezone */}
              <div>
                <label className="label">Timezone</label>
                <select className="input-field" style={{ colorScheme: 'dark' }} {...register('timezone')}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── CARD 2: Subjects ── */}
          <div className="card p-7 space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {profile.role === 'teacher' ? 'Subjects offered' : 'Subjects to learn'}
            </h2>
            <SubjectTagInput value={subjects} onChange={setSubjects} maxTags={8} />
          </div>

          {/* ── CARD 3: GPA (student) or min GPA (teacher) ── */}
          <div className="card p-7 space-y-4"
            style={{ border: '1px solid rgba(0,192,232,0.15)' }}>
            <div>
              <h2 className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                {profile.role === 'student' ? 'GPA per subject' : 'Minimum GPA required per subject'}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(139,175,200,0.5)' }}>
                {profile.role === 'student'
                  ? 'Enter your current GPA for each subject you want to learn (0.0 – 4.0).'
                  : 'Set the minimum GPA a student must have for each subject (0.0 – 4.0). Leave blank for no requirement.'}
              </p>
            </div>
            {profile.role === 'student' ? (
              <GpaEditor
                subjects={subjects}
                gpaMap={gpaMap}
                onChange={setGpaMap}
                label="Your GPA"
                hint="Student GPA ≥ teacher's minimum requirement to be shown as a match."
              />
            ) : (
              <GpaEditor
                subjects={subjects}
                gpaMap={minGpaMap}
                onChange={setMinGpaMap}
                label="Minimum GPA"
                hint="Students with GPA below these values will not be shown to you."
              />
            )}
          </div>

          {/* ── CARD 4: Learning mode + location ── */}
          <div className="card p-7 space-y-5">
            <h2 className="text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {profile.role === 'teacher' ? 'Teaching mode' : 'Learning mode'}
            </h2>

            {/* Mode toggle */}
            <div>
              <label className="label">Preferred mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['online', 'offline', 'both'] as const).map((mode) => (
                  <label key={mode}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl cursor-pointer transition-all duration-150 text-sm capitalize"
                    style={
                      learningMode === mode
                        ? {
                            background: 'linear-gradient(135deg,rgba(0,192,232,0.15),rgba(238,131,200,0.12))',
                            border: '1px solid rgba(0,192,232,0.45)',
                            color: '#00C0E8',
                          }
                        : {
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(0,192,232,0.1)',
                            color: 'var(--muted)',
                          }
                    }>
                    <input type="radio" value={mode} className="sr-only" {...register('learning_mode')} />
                    {mode === 'online' ? '🌐' : mode === 'offline' ? '📍' : '🔄'} {mode}
                  </label>
                ))}
              </div>
            </div>

            {/* Location — shown when offline or both */}
            {needsLocation && (
              <div className="fade-up">
                <label className="label">Location (city / district)</label>
                <input type="text"
                  placeholder="e.g. District 1, Ho Chi Minh City"
                  className="input-field"
                  {...register('location')} />
                <p className="text-xs mt-1.5" style={{ color: 'rgba(139,175,200,0.5)', fontFamily: 'var(--font-mono)' }}>
                  Used to match students and teachers in the same area.
                </p>
              </div>
            )}
          </div>

          {/* ── CARD 5: Special needs ── */}
          <div className="card p-7 space-y-4">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Special needs
              </h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(139,175,200,0.5)' }}>
                {profile.role === 'student'
                  ? 'Select any that apply. You will only be matched with teachers who support these.'
                  : 'Select the special needs you are equipped to support. Only students with these needs will be matched to you.'}
              </p>
            </div>
            <SpecialNeedsSelect value={specialNeeds} onChange={setSpecialNeeds} />
            {specialNeeds.length === 0 && (
              <p className="text-xs" style={{ color: 'rgba(139,175,200,0.4)', fontFamily: 'var(--font-mono)' }}>
                None selected — {profile.role === 'student' ? 'will not filter matches.' : 'students with special needs will not be matched to you.'}
              </p>
            )}
          </div>

          {/* ── CARD 6: Student-only — Budget ── */}
          {profile.role === 'student' && (
            <div className="card p-7 space-y-5"
              style={{ border: '1px solid rgba(0,192,232,0.15)' }}>
              <h2 className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Budget
              </h2>
              <div>
                <label className="label">Maximum budget (USD / hr)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>$</span>
                  <input type="number" min="1" max="9999" step="0.01"
                    placeholder="50.00"
                    className="input-field pl-8"
                    {...register('max_budget')} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(139,175,200,0.5)', fontFamily: 'var(--font-mono)' }}>
                  Teachers charging more than this will not appear in your matches.
                </p>
              </div>
            </div>
          )}

          {/* ── CARD 7: Teacher-only — Rates + Experience + Certs ── */}
          {profile.role === 'teacher' && (
            <div className="card p-7 space-y-5"
              style={{ border: '1px solid rgba(238,131,200,0.18)' }}>
              <h2 className="text-xs font-medium uppercase tracking-widest"
                style={{ color: '#EE83C8', fontFamily: 'var(--font-mono)' }}>
                Teaching details
              </h2>

              {/* Hourly rate */}
              <div>
                <label className="label">Minimum hourly rate (USD / hr)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>$</span>
                  <input type="number" min="1" max="9999" step="0.01"
                    placeholder="25.00"
                    className={`input-field pl-8 ${errors.hourly_rate ? 'error' : ''}`}
                    {...register('hourly_rate')} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(139,175,200,0.5)', fontFamily: 'var(--font-mono)' }}>
                  Students with a lower budget will not be shown as matches.
                </p>
              </div>

              {/* Years of experience */}
              <div>
                <label className="label">Years of experience</label>
                <input type="number" min="0" max="50"
                  placeholder="e.g. 5"
                  className="input-field"
                  {...register('years_experience')} />
              </div>

              {/* Certifications */}
              <div>
                <label className="label">Certifications / qualifications</label>
                <input type="text"
                  placeholder="e.g. IELTS Examiner, B.Ed Mathematics, TESOL"
                  className="input-field"
                  {...register('certifications')} />
                <p className="text-xs mt-1.5" style={{ color: 'rgba(139,175,200,0.5)', fontFamily: 'var(--font-mono)' }}>
                  Displayed on your profile card as a trust signal.
                </p>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit"
              disabled={saveState === 'saving'}
              className="btn-primary flex items-center gap-2 px-7">
              {saveState === 'saving'
                ? <><span className="spinner" />Saving…</>
                : saveState === 'saved' ? '✓ Saved!' : 'Save changes'}
            </button>
            <button type="button"
              onClick={() => router.push('/dashboard')}
              className="btn-ghost">
              Cancel
            </button>
            {isDirty && saveState === 'idle' && (
              <span className="text-xs ml-auto"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Unsaved changes
              </span>
            )}
          </div>
        </form>

        {/* ── Account info (read-only) ── */}
        <div className="mt-10 pt-8 border-t fade-up-3"
          style={{ borderColor: 'rgba(0,192,232,0.08)' }}>
          <h2 className="text-xs font-medium uppercase tracking-widest mb-4"
            style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            Account
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Email', value: user?.email },
              { label: 'Role', value: profile.role, cyan: true },
              {
                label: 'Member since',
                value: new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              },
            ].map(({ label, value, cyan }) => (
              <div key={label} className="card flex items-center justify-between py-3 px-4">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
                <span className="text-sm capitalize"
                  style={{ color: cyan ? '#00C0E8' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}