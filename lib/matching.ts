import type { Profile } from '@/types/database'

export interface MatchResult {
  score: number
  reasons: string[]
  blockers: string[]
}

export function calculateMatch(student: Profile | null, teacher: Profile | null): MatchResult {
  if (!student || !teacher || student.role !== 'student' || teacher.role !== 'teacher') {
    return { score: 0, reasons: [], blockers: ['Invalid profiles for matching'] }
  }

  let score = 0
  const reasons: string[] = []
  const blockers: string[] = []

  // 1. Subjects Overlap (Trọng số: 30)
  const studentSubjects = student.subjects || []
  const teacherSubjects = teacher.subjects || []
  const sharedSubjects = studentSubjects.filter((s) => teacherSubjects.includes(s))
  
  if (sharedSubjects.length === 0) {
    blockers.push('No shared subjects')
  } else {
    score += 30
    reasons.push(`Matches ${sharedSubjects.length} subject(s): ${sharedSubjects.slice(0, 2).join(', ')}`)
  }

  // 2. Learning Mode (Trọng số: 20)
  const sMode = student.learning_mode || 'both'
  const tMode = teacher.learning_mode || 'both'
  if (sMode === 'online' && tMode === 'offline') {
    blockers.push('Student wants online, Teacher is offline-only')
  } else if (sMode === 'offline' && tMode === 'online') {
    blockers.push('Student wants offline, Teacher is online-only')
  } else {
    score += 20
    reasons.push(`Compatible learning mode (${sMode})`)
  }

  // 3. Budget vs Rate (Trọng số: 25)
  const budget = student.max_budget
  const rate = teacher.hourly_rate
  if (budget !== null && rate !== null) {
    if (rate > budget) {
      blockers.push(`Teacher rate ($${rate}/hr) exceeds max budget ($${budget}/hr)`)
    } else {
      score += 25
      reasons.push(`Within budget ($${rate}/hr)`)
    }
  } else {
    score += 15 // Điểm khuyến khích nếu 1 trong 2 chưa nhập giá
  }

  // 4. GPA Requirements (Trọng số: 25)
  let gpaMet = true
  if (teacher.min_gpa_per_subject && student.gpa_per_subject && sharedSubjects.length > 0) {
    for (const subj of sharedSubjects) {
      const minGpa = teacher.min_gpa_per_subject[subj] as number | undefined
      const stuGpa = student.gpa_per_subject[subj] as number | undefined
      if (minGpa !== undefined && stuGpa !== undefined && stuGpa < minGpa) {
        blockers.push(`Student GPA (${stuGpa}) below requirement (${minGpa}) for ${subj}`)
        gpaMet = false
      }
    }
  }
  if (gpaMet && sharedSubjects.length > 0) {
    score += 25
    reasons.push('Meets GPA requirements')
  }

  // 5. Bonus: Special Needs (Điểm cộng: +10)
  if (student.special_needs && student.special_needs.length > 0) {
    const teacherNeeds = teacher.special_needs || []
    
    // Tìm xem có nhu cầu đặc biệt nào của học sinh mà giáo viên KHÔNG hỗ trợ không
    const unhandledNeeds = student.special_needs.filter(need => !teacherNeeds.includes(need))
    
    if (unhandledNeeds.length > 0) {
      // Nếu giáo viên không hỗ trợ -> Đánh trượt ngay lập tức
      blockers.push(`Teacher does not support: ${unhandledNeeds.join(', ')}`)
    } else {
      // Nếu hỗ trợ đầy đủ -> Cho điểm cộng tuyệt đối
      score += 10
      reasons.push('Teacher supports all required special needs')
    }
  } else {
    // Học sinh bình thường không có nhu cầu đặc biệt thì vẫn được trọn vẹn điểm phần này
    score += 10
  }

  return {
    score: Math.min(100, score), // Max là 100
    reasons,
    blockers,
  }
}