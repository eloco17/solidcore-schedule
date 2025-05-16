"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { ScheduleData } from "@/lib/types"
import ScheduleDay from "@/components/schedule-day"
import ScheduleDialog from "@/components/schedule-dialog"

interface UserScheduleDisplayProps {
  userId?: string // Optional prop for when userId is passed directly
}

export default function UserScheduleDisplay({ userId: propUserId }: UserScheduleDisplayProps) {
  const router = useRouter()
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<any>(null)

  // Get the user ID from props or session
  const userId = propUserId || sessionData?.user?.id

  useEffect(() => {
    async function fetchUserSchedule() {
      try {
        setLoading(true)

        const response = await fetch(`/api/schedule/user`, {
          cache: "no-store",
        })

        if (!response.ok) {
          const errorData = await response.json()

          if (errorData.code === "credentials-missing") {
            setError("lifetime-credentials-missing")
            return
          }

          throw new Error(errorData.message || `Failed to fetch schedule: ${response.status}`)
        }

        const data = await response.json()
        setScheduleData(data)
        setError(null)
      } catch (error) {
        console.error("Error fetching user schedule:", error)
        setError("fetch-error")
        toast.error("Error loading schedule", {
          description: error.message || "Failed to load schedule data",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserSchedule()
  }, [userId])

  const handleRefresh = () => {
    setLoading(true)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your schedule...</span>
      </div>
    )
  }

  if (error === "lifetime-credentials-missing") {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Lifetime Credentials Required</h2>
        <p className="mb-4">Please add your Lifetime Fitness credentials to view and schedule sessions.</p>
        <Button onClick={() => router.push("/settings")}>Add Credentials</Button>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Error Loading Schedule</h2>
        <p className="mb-4">We encountered an error while loading your schedule. Please try again.</p>
        <Button onClick={handleRefresh}>Retry</Button>
      </Card>
    )
  }

  if (!scheduleData || !scheduleData.days || scheduleData.days.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">No Schedule Data</h2>
        <p className="mb-4">We couldn't find any pickleball sessions in your schedule.</p>
        <Button onClick={handleRefresh}>Refresh</Button>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{scheduleData.month} Schedule</h2>
        <Button onClick={handleRefresh} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {scheduleData.days.map((day) => (
          <ScheduleDay
            key={`${day.name}-${day.date}`}
            day={day}
            userId={userId}
            onSessionClick={(session) => {
              setSelectedSession(session)
              setSelectedDay(day)
            }}
          />
        ))}
      </div>

      {selectedSession && selectedDay && (
        <ScheduleDialog
          session={selectedSession}
          day={selectedDay}
          userId={userId}
          open={!!selectedSession}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSession(null)
              setSelectedDay(null)
            }
          }}
        />
      )}
    </div>
  )
}
