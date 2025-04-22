"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { schedulePickleballBot } from "@/app/actions"

export default function DebugError() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const testScheduling = () => {
    setLoading(true)
    setError(null)

    // Create an AbortController for this operation
    const abortController = new AbortController()
    const signal = abortController.signal

    async function runTest() {
      try {
        // Test with minimal params
        const result = await schedulePickleballBot({
          sessionId: "test-session-1",
          title: "Test Session",
          day: "SUNDAY",
          date: 31, // Use current or future date
          startTime: "9:00 AM",
          endTime: "10:30 AM",
          location: "Indoor Courts",
        })

        if (signal.aborted) return

        console.log("Test result:", result)

        if (!result.success) {
          setError(result.message)
        }
      } catch (err) {
        if (signal.aborted) return

        console.error("Error in test:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    runTest()

    // Return a cleanup function that aborts the operation if the component unmounts
    return () => {
      abortController.abort()
    }
  }

  return (
    <div className="p-4 border rounded-lg mb-6">
      <h3 className="font-bold mb-2">Debug Scheduling</h3>

      <Button onClick={testScheduling} disabled={loading} variant="outline" className="mb-4">
        {loading ? "Testing..." : "Test Schedule Function"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

