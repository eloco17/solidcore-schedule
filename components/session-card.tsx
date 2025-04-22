import { Button } from "@/components/ui/button"
import { getJobData } from "@/lib/storage-utils"
import { useEffect, useState } from "react"
import { Session } from "@/app/types/session"

interface SessionCardProps {
  session: Session
  userId: string | null
  onScheduleClick: () => void
}

export function SessionCard({ session, userId, onScheduleClick }: SessionCardProps) {
  const [isScheduled, setIsScheduled] = useState(false)

  useEffect(() => {
    if (session?.id && userId) {
      const jobData = getJobData(userId, session.id)
      setIsScheduled(!!jobData)
    }
  }, [session?.id, userId])

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{session.title}</h3>
        {isScheduled && (
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Scheduled
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Skill Level:</span> {session.skillLevel}
        </div>
        <div>
          <span className="font-medium">Time:</span> {session.startTime} - {session.endTime}
        </div>
        <div>
          <span className="font-medium">Location:</span> {session.location}
        </div>
      </div>

      <div className="mt-4">
        <Button 
          onClick={onScheduleClick}
          variant={isScheduled ? "outline" : "default"}
          className="w-full"
        >
          {isScheduled ? "View Details" : "Schedule Bot"}
        </Button>
      </div>
    </div>
  )
} 