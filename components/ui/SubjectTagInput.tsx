'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface SubjectTagInputProps {
  value: string[]
  onChange: (subjects: string[]) => void
  maxTags?: number
}

const SUGGESTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'English', 'History', 'Geography', 'Economics',
  'Computer Science', 'Statistics', 'Calculus', 'Algebra',
  'Vietnamese', 'French', 'Spanish', 'Japanese',
  'Music Theory', 'Art', 'SAT Prep', 'IELTS',
]

export function SubjectTagInput({ value, onChange, maxTags = 8 }: SubjectTagInputProps) {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(s)
  ).slice(0, 6)

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return
    onChange([...value, trimmed])
    setInput('')
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      {/* Tag display + input */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[48px] w-full px-3 py-2 rounded-xl flex flex-wrap gap-1.5 items-center cursor-text transition-all duration-200"
        style={{
          background: '#1e2d42',
          border: `1px solid ${isFocused ? '#00C0E8' : 'rgba(0,192,232,0.15)'}`,
          boxShadow: isFocused ? '0 0 0 3px rgba(0,192,232,0.1)' : 'none',
        }}>
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(0,192,232,0.12)',
              border: '1px solid rgba(0,192,232,0.3)',
              color: '#00C0E8',
              fontFamily: 'var(--font-mono)',
            }}>
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity text-sm leading-none">
              ×
            </button>
          </span>
        ))}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            placeholder={value.length === 0 ? 'Add subjects (e.g. Math, Physics)…' : ''}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)' }}
          />
        )}
      </div>

      {/* Autocomplete dropdown */}
      {isFocused && (filtered.length > 0 || input.trim()) && (
        <div
          className="absolute z-10 w-full mt-1.5 rounded-xl overflow-hidden"
          style={{ background: '#243452', border: '1px solid rgba(0,192,232,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-100"
              style={{ color: 'var(--text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,192,232,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              {s}
            </button>
          ))}
          {input.trim() && !SUGGESTIONS.includes(input.trim()) && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(input) }}
              className="w-full text-left px-4 py-2.5 text-sm border-t"
              style={{ color: '#EE83C8', borderColor: 'rgba(0,192,232,0.1)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(238,131,200,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              + Add &ldquo;{input.trim()}&rdquo;
            </button>
          )}
        </div>
      )}

      <p className="text-xs mt-1.5" style={{ color: 'rgba(139,175,200,0.5)', fontFamily: 'var(--font-mono)' }}>
        {value.length}/{maxTags} · Enter or comma to add
      </p>
    </div>
  )
}