'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/authStore'

const SignupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['student', 'teacher'], { message: 'Select a role' }),
})

type SignupForm = z.infer<typeof SignupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { signUp, isLoading } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { role: 'student' },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: SignupForm) => {
    setServerError(null)
    const { error } = await signUp({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      role: data.role,
    })
    if (error) {
      setServerError(error)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  if (success) {
    return (
      <div className="page-shell flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-sm fade-up">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold gradient-text mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Account created!
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Check your email to confirm your account. Redirecting to login…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell flex items-center justify-center min-h-screen px-4 py-12">

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #EE83C8, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00C0E8, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg,#00C0E8,#EE83C8)' }}>
            <span className="text-[#182131] font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>T</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Join Tutorinder
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Create your account to get started</p>
        </div>

        <div className="gradient-border">
          <div className="card p-8 rounded-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Server error */}
              {serverError && (
                <div className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(238,131,200,0.08)', border: '1px solid rgba(238,131,200,0.3)', color: '#EE83C8' }}>
                  {serverError}
                </div>
              )}

              {/* Role selector */}
              <div>
                <label className="label">I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['student', 'teacher'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setValue('role', r)}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 capitalize"
                      style={selectedRole === r ? {
                        background: 'linear-gradient(135deg, rgba(0,192,232,0.15), rgba(238,131,200,0.15))',
                        border: '1px solid rgba(0,192,232,0.5)',
                        color: '#00C0E8',
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(0,192,232,0.12)',
                        color: 'var(--muted)',
                      }}>
                      {r === 'student' ? '🎓 Student' : '📚 Teacher'}
                    </button>
                  ))}
                </div>
                {errors.role && <p className="error-msg">{errors.role.message}</p>}
              </div>

              {/* Full name */}
              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  placeholder="Alex Nguyen"
                  className={`input-field ${errors.fullName ? 'error' : ''}`}
                  {...register('fullName')}
                />
                {errors.fullName && <p className="error-msg">{errors.fullName.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`input-field ${errors.email ? 'error' : ''}`}
                  {...register('email')}
                />
                {errors.email && <p className="error-msg">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  className={`input-field ${errors.password ? 'error' : ''}`}
                  {...register('password')}
                />
                {errors.password && <p className="error-msg">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
                {isLoading ? (
                  <><span className="spinner" />Creating account…</>
                ) : 'Create account'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium transition-colors" style={{ color: '#00C0E8' }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}