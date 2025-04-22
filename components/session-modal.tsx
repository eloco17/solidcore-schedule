"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { schedulePickleballBot, deleteScheduledJob } from "@/lib/actions"
import { Loader2, Check, X, Calendar, Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

interface SessionModalProps {
  isOpen: boolean
  onClose: () => void
  session: {
    id: string
    title: string
    subtitle?: string
    startTime: string
    endTime: string
    location: string
    status?: string
  }
  day: {
    name: string
    date: number
  }
  isScheduled: boolean
}

export function SessionModal({ isOpen, onClose, session, day, isScheduled }: SessionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    jobId?: string
    cronExpression?: string
    skillLevel?: string
    formattedStartTime?: string
  } | null>(null)

  const handleSchedule = async () => {
    setIsScheduling(true)
    setIsLoading(true)

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
      })

      setResult(result)

      if (result.success) {
        toast({
          title: "Bot Scheduled",
          description: result.message,
          action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Scheduling Failed",
          description: result.message,
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        })
      }
    } catch (error) {
      console.error("Error scheduling bot:", error)
      setResult({
        success: false,
        message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
      })

      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to schedule bot: ${error instanceof Error ? error.message : String(error)}`,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    setIsLoading(true)

    try {
      const result = await deleteScheduledJob(session.id)

      if (result.success) {
        setResult(null)
        toast({
          title: "Bot Cancelled",
          description: result.message,
          action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Cancellation Failed",
          description: result.message,
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        })
      }
    } catch (error) {
      console.error("Error cancelling bot:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to cancel bot: ${error instanceof Error ? error.message : String(error)}`,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      })
    } finally {
      setIsLoading(false)
      setIsCancelling(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{session.title}</DialogTitle>
          <DialogDescription className="flex flex-col gap-2 pt-2">
            {session.subtitle && <span className="text-sm text-muted-foreground">{session.subtitle}</span>}

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {day.name}, {day.date}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {session.startTime} - {session.endTime}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{session.location}</span>
            </div>

            {session.status && (
              <Badge variant={session.status === "Waitlist" ? "secondary" : "default"} className="w-fit">
                {session.status}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-4">
          {result?.success && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <h4 className="font-medium flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Bot Scheduled
              </h4>
              <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
              {result.cronExpression && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Cron Expression:</p>
                  <code className="text-xs bg-background p-1 rounded">{result.cronExpression}</code>
                </div>
              )}
              {result.skillLevel && (
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground">
                    Skill Level: <span className="font-medium">{result.skillLevel}</span>
                  </p>
                </div>
              )}
              {result.formattedStartTime && (
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground">
                    Start Time (24h): <span className="font-medium">{result.formattedStartTime}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          <div className="flex gap-2">
            {isScheduled || result?.success ? (
              <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
                {isLoading && isCancelling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Cancel Bot
              </Button>
            ) : (
              <Button onClick={handleSchedule} disabled={isLoading}>
                {isLoading && isScheduling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                Schedule Bot
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

