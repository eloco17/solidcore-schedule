"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function ApiKeyChecker() {
  const [missingKeys, setMissingKeys] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState<boolean>(false)
  const router = useRouter()

  useEffect(() => {
    async function checkApiKey() {
      try {
        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime()
        const response = await fetch(`/api/check-api-key?t=${timestamp}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        })

        // Parse the response
        const data = await response.json()
        console.log("API key check response:", data)

        if (response.ok) {
          // Check if we need authentication
          if (data.error === "Authentication required" || data.authenticated === false) {
            setNeedsAuth(true)
            setError("Please log in to check API key status")
          } else {
            setMissingKeys(!data.hasApiKey && !data.exists)
          }
        } else {
          // If there's an auth error, we'll show a different message
          if (response.status === 401) {
            setNeedsAuth(true)
            setError("Please log in to check API key status")
          } else {
            setMissingKeys(true)
            setError(`Error checking API key: ${data.error || response.statusText}`)
          }
        }
      } catch (e) {
        console.error("Error checking API key:", e)
        setMissingKeys(true)
        setError("Could not connect to API key service")
        toast.error("API Check Error", {
          description: "Could not connect to API key service",
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkApiKey()
  }, [])

  const handleGoToLogin = () => {
    // Use window.location for a hard redirect
    window.location.href = "/login"
  }

  if (isLoading) {
    return null
  }

  if (needsAuth) {
    return (
      <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium">Authentication Required</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button size="sm" onClick={handleGoToLogin}>
            Go to Login
          </Button>
        </div>
      </Card>
    )
  }

  if (!missingKeys) {
    return null
  }

  return (
    <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h3 className="font-medium">Missing Environment Variables</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Some required environment variables are missing. Please add them in your settings.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/settings")}>
          Go to Settings
        </Button>
      </div>
    </Card>
  )
}






