'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/authStore'

const LoginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof LoginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isLoading } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    const { error } = await signIn({ email: data.email, password: data.password })
    if (error) {
      setServerError(error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="page-shell flex items-center justify-center min-h-screen px-4">

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00C0E8, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #EE83C8, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md fade-up">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg,#00C0E8,#EE83C8)' }}>
            <span className="text-[#182131] font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>T</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Sign in to your Tutorinder account</p>
        </div>

        {/* Form card */}
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
                  placeholder="••••••••"
                  className={`input-field ${errors.password ? 'error' : ''}`}
                  {...register('password')}
                />
                {errors.password && <p className="error-msg">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium transition-colors" style={{ color: '#00C0E8' }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  )
}