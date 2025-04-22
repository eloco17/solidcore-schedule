"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { schedulePickleballBot, checkJobStatus, deleteScheduledJob } from "@/app/actions"
import { Loader2, Calendar, Clock, MapPin, User } from "lucide-react"
import { getJobData, storeJobData, deleteJobData } from "@/lib/storage-utils"
import { useSession } from "next-auth/react"
import { Session, SessionDay, SessionUser } from "@/app/types/session"

// Update the interfaces
interface JobStatus {
  exists: boolean
  jobId: string | null
  details?: Record<string, any>
  error?: string
}

interface ScheduleResult {
  success: boolean
  message?: string
  jobId?: string
  scheduledTime?: string
  sessionOpeningTime?: string
  skillLevel?: string
  formattedStartTime?: string
  jobDetails?: Record<string, any>
}

interface ScheduleError extends Error {
  message: string
}

interface ScheduleDialogProps {
  session: Session | null
  day: SessionDay | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string | null
}

export default function ScheduleDialog({ session, day, open, onOpenChange, userId: propUserId }: ScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { data: sessionData } = useSession()
  const [jobStatus, setJobStatus] = useState<JobStatus>({ exists: false, jobId: null })

  // Get the user ID from props or session, ensuring proper type handling
  const sessionUser = sessionData?.user as SessionUser | undefined
  const effectiveUserId = (propUserId !== undefined ? propUserId : sessionUser?.id ?? null) as string | null

  // Check job status when dialog opens or user changes
  useEffect(() => {
    if (open && session?.id && effectiveUserId) {
      checkJobExistence()
    } else {
      // Reset status when dialog closes or user changes
      setJobStatus({ exists: false, jobId: null })
    }
  }, [open, session?.id, effectiveUserId])

  const checkJobExistence = async () => {
    if (!session?.id || !effectiveUserId) {
      setJobStatus({ exists: false, jobId: null })
      return
    }

    try {
      // Check status with server
      const response = await fetch('/api/auth/sessions/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionIds: [session.id] }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session status');
      }

      const result = await response.json();
      const status = result.sessions?.[session.id];
      
      if (status?.exists && status.userId === effectiveUserId) {
        setJobStatus({
          exists: true,
          jobId: status.jobId,
          details: status.details
        });
      } else {
        setJobStatus({
          exists: false,
          jobId: null
        });
      }
    } catch (error) {
      console.error("Error checking job status:", error)
      setJobStatus({
        exists: false,
        jobId: null,
        error: String(error)
      })
    }
  }

  const handleSchedule = async () => {
    if (!session || !day || !effectiveUserId) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await schedulePickleballBot({
        sessionId: session.id,
        title: session.title,
        day: day.name,
        date: day.date,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
        subtitle: session.subtitle,
        userId: effectiveUserId
      })

      if (result.success) {
        setSuccess(true)
        setJobStatus({
          exists: true,
          jobId: result.jobId,
          details: result.jobDetails
        })

        // Trigger a refresh of the session status
        window.dispatchEvent(new Event('session-status-refresh'))

        toast.success("Session scheduled successfully")

        // Close the dialog after a short delay
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        setError(result.message || "Failed to schedule session")
        toast.error("Failed to schedule session", {
          description: result.message
        })
      }
    } catch (error) {
      console.error("Error scheduling session:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setError(errorMessage)
      toast.error("Error", {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!session?.id || !effectiveUserId) return

    setLoading(true)
    setError(null)

    try {
      const result = await deleteScheduledJob(session.id)

      if (result?.success) {
        setSuccess(false)
        setJobStatus({
          exists: false,
          jobId: null
        })

        // Trigger a refresh of the session status
        window.dispatchEvent(new Event('session-status-refresh'))

        toast.success("Session unscheduled successfully")

        // Close the dialog after a short delay
        setTimeout(() => {
          onOpenChange(false)
        }, 1000)
      } else {
        const errorMessage = result?.message || "Failed to unschedule session"
        setError(errorMessage)
        toast.error("Failed to unschedule session", {
          description: errorMessage
        })
      }
    } catch (error) {
      console.error("Error unscheduling session:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setError(errorMessage)
      toast.error("Error", {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  if (!session || !day) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white text-black">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-black">{session?.title}</DialogTitle>
            {jobStatus.exists && (
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Scheduled
              </span>
            )}
          </div>
          <DialogDescription className="text-gray-600">
            Schedule a bot to automatically book this session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4 text-black">
            <Calendar className="h-4 w-4" />
            <div className="col-span-3">
              {day?.name} {day?.date}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 text-black">
            <Clock className="h-4 w-4" />
            <div className="col-span-3">
              {session?.startTime} - {session?.endTime}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 text-black">
            <MapPin className="h-4 w-4" />
            <div className="col-span-3">{session?.location}</div>
          </div>
          {session?.subtitle && (
            <div className="grid grid-cols-4 items-center gap-4 text-black">
              <User className="h-4 w-4" />
              <div className="col-span-3">{session.subtitle}</div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {!error && success && (
          <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm font-medium text-green-800">Bot Information</p>
            <p className="mt-1 text-sm text-green-700">
              The bot has been scheduled and will run automatically at the appropriate time.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!error && effectiveUserId && (
            <div className="flex gap-2">
              {jobStatus.exists ? (
                <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Booking"
                  )}
                </Button>
              ) : (
                <Button onClick={handleSchedule} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Bot"
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

