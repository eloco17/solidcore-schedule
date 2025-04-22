export interface Session {
  id: string
  title: string
  startTime: string
  endTime: string
  description?: string
  location?: string
  maxParticipants?: number
  skillLevel?: string
  subtitle?: string
}

export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export interface SessionDay {
  name: string
  date: string
  sessions: Session[]
  highlight?: boolean
}

export interface SessionStatus {
  exists: boolean
  status: 'unscheduled' | 'scheduled' | 'error' | 'pending'
  error?: string
  jobId?: string
  details?: {
    userId: string
    sessionId: string
    title?: string
    day?: string
    date?: string
    startTime?: string
    endTime?: string
    location?: string
    skillLevel?: string
    scheduledAt?: string
    [key: string]: any
  }
}