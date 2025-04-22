"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import type { Day, Session } from "@/lib/types"
import { getJobData } from "@/lib/storage-utils"

interface ScheduleDayProps {
  day: Day
  onSessionClick: (session: Session, day: Day) => void
  userId?: string // Optional prop for when userId is passed directly
}

export default function ScheduleDay({ day, onSessionClick, userId: propUserId }: ScheduleDayProps) {
  const { data: sessionData } = useSession()
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, boolean>>({})

  // Get the user ID from props or session
  const userId = propUserId || sessionData?.user?.id

  // Use a ref to track if the component is mounted
  const isMounted = useRef(true)

  // Set up the mounted ref
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Check localStorage for scheduled sessions with user isolation
  const checkLocalStorage = () => {
    if (!userId) return

    const statuses: Record<string, boolean> = {}

    day.sessions.forEach((session) => {
      // Check localStorage with user isolation
      const storedJob = getJobData(userId, session.id)
      statuses[session.id] = !!storedJob
    })

    if (isMounted.current) {
      setSessionStatuses(statuses)
    }
  }

  // Initial check
  useEffect(() => {
    if (userId) {
      checkLocalStorage()
    }

    // Listen for custom events
    const handleJobStatusChanged = () => {
      if (isMounted.current && userId) {
        checkLocalStorage()
      }
    }

    // Add event listeners
    window.addEventListener("job-status-changed", handleJobStatusChanged)

    // Also listen for storage events (in case localStorage changes in another tab)
    window.addEventListener("storage", () => {
      if (userId) checkLocalStorage()
    })

    return () => {
      window.removeEventListener("job-status-changed", handleJobStatusChanged)
      window.removeEventListener("storage", () => {
        if (userId) checkLocalStorage()
      })
    }
  }, [day.sessions, userId])

  return (
    <div className={`border rounded overflow-hidden ${day.highlight ? "border-blue-500 bg-blue-50" : ""}`}>
      <div className={`p-3 font-bold ${day.highlight ? "bg-blue-500 text-white" : "bg-gray-100"}`}>{day.header}</div>

      <div className="p-3">
        {day.sessions.length === 0 ? (
          <p className="text-gray-500">No sessions scheduled</p>
        ) : (
          <div className="space-y-3">
            {day.sessions.map((session) => (
              <div
                key={session.id}
                className="border-b pb-2 last:border-b-0 last:pb-0 hover:bg-gray-50 cursor-pointer transition-colors p-2 rounded"
                onClick={() => onSessionClick(session, day)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm">
                      {session.startTime} - {session.endTime}
                    </p>
                    <p className="text-sm">{session.location}</p>
                    {session.subtitle && <p className="text-xs text-gray-600 mt-1">{session.subtitle}</p>}
                    {session.status && (
                      <p
                        className={`text-xs mt-1 ${
                          session.status === "Waitlist" ? "text-orange-600" : "text-blue-600"
                        }`}
                      >
                        {session.status}
                      </p>
                    )}
                  </div>
                  {sessionStatuses[session.id] && (
                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Scheduled</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
