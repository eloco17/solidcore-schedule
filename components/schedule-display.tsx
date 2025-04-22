"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import ScheduleDay from "@/components/schedule-day"
import ScheduleDialog from "@/components/schedule-dialog"
import type { ScheduleData, Session, Day } from "@/lib/types"

export default function ScheduleDisplay() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedDay, setSelectedDay] = useState<Day | null>(null)

  const searchParams = useSearchParams()
  const debug = searchParams.get("debug") === "true"

  useEffect(() => {
    // Create an AbortController for this effect
    const abortController = new AbortController()
    const signal = abortController.signal

    async function fetchScheduleData(refresh = false) {
      try {
        setRefreshing(refresh)

        // Build the API URL with appropriate parameters
        const apiUrl = `/api/schedule?${refresh ? "refresh=true" : ""}${debug ? "&debug=true" : ""}`

        console.log(`Fetching schedule data from: ${apiUrl}`)
        const response = await fetch(apiUrl, {
          cache: "no-store",
          signal,
        })

        if (signal.aborted) return

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`)
        }

        const data = await response.json()

        if (signal.aborted) return

        console.log("Schedule data received:", data._source || "unknown source")

        setScheduleData(data)
        setLoading(false)
        setRefreshing(false)
      } catch (err) {
        if (signal.aborted) return

        console.error("Error fetching schedule data:", err)
        setError(err.message)
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchScheduleData()

    // Cleanup function to abort any pending operations
    return () => {
      abortController.abort()
    }
  }, [debug])

  const handleSessionClick = (session: Session, day: Day) => {
    setSelectedSession(session)
    setSelectedDay(day)
  }

  const handleCloseDialog = () => {
    setSelectedSession(null)
    setSelectedDay(null)
  }

  const handleRefresh = () => {
    // Create an AbortController for this operation
    const abortController = new AbortController()
    const signal = abortController.signal

    async function refreshData() {
      try {
        setRefreshing(true)

        // Build the API URL with appropriate parameters
        const apiUrl = `/api/schedule?refresh=true${debug ? "&debug=true" : ""}`

        console.log(`Refreshing schedule data from: ${apiUrl}`)
        const response = await fetch(apiUrl, {
          cache: "no-store",
          signal,
        })

        if (signal.aborted) return

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`)
        }

        const data = await response.json()

        if (signal.aborted) return

        console.log("Schedule data refreshed:", data._source || "unknown source")

        setScheduleData(data)
        setRefreshing(false)
      } catch (err) {
        if (signal.aborted) return

        console.error("Error refreshing schedule data:", err)
        setError(err.message)
        setRefreshing(false)
      }
    }

    refreshData()

    // Return a cleanup function that aborts the operation if the component unmounts
    return () => {
      abortController.abort()
    }
  }

  if (loading) return <div className="p-4">Loading schedule data...</div>
  if (error) return <div className="p-4 text-red-500">Error loading schedule: {error}</div>
  if (!scheduleData) return <div className="p-4">No schedule data available</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{scheduleData.month} Schedule</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {scheduleData.fromGitHub && (
        <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded text-green-800">
          ✅ Using data from GitHub repository
        </div>
      )}

      {scheduleData._source && debug && (
        <div className="mb-4 p-2 bg-gray-100 border rounded">
          <p>
            <strong>Source:</strong> {scheduleData._source}
          </p>
          {scheduleData.timestamp && (
            <p>
              <strong>Timestamp:</strong> {scheduleData.timestamp}
            </p>
          )}
          {scheduleData.lastUpdated && (
            <p>
              <strong>Last Updated:</strong> {scheduleData.lastUpdated}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {scheduleData.days.map((day) => (
          <ScheduleDay key={`${day.name}-${day.date}`} day={day} onSessionClick={handleSessionClick} />
        ))}
      </div>

      <ScheduleDialog
        session={selectedSession}
        day={selectedDay}
        open={selectedSession !== null}
        onOpenChange={handleCloseDialog}
      />
    </div>
  )
}

