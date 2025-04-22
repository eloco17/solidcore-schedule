"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { toast } from "sonner"

interface LifetimeCredentialsFormProps {
  userId: string
}

export default function LifetimeCredentialsForm({ userId }: LifetimeCredentialsFormProps) {
  const [lifetimeUsername, setLifetimeUsername] = useState("")
  const [lifetimePassword, setLifetimePassword] = useState("")
  const [memberId, setMemberId] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lifetimeUsername || !lifetimePassword) {
      toast.error("Please enter both username and password")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/user/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies in the request
        body: JSON.stringify({
          userId,
          lifetimeUsername,
          lifetimePassword,
          memberId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save credentials")
      }

      const data = await response.json()
      toast.success("Credentials saved successfully")
    } catch (error: any) {
      console.error("Error saving credentials:", error)
      toast.error(error.message || "Failed to save credentials")
    } finally {
      setLoading(false)
    }
  }

  // Debug function
  const debugCredentials = async () => {
    try {
      const response = await fetch("/api/user/debug-credentials", {
        credentials: "include", // Include cookies in the request
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch debug info")
      }
      
      const data = await response.json()
      console.log("Credentials debug:", data)
      toast.info("Check console for credentials debug info")
    } catch (error: any) {
      console.error("Debug error:", error)
      toast.error(error.message || "Failed to debug credentials")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifetime Fitness Credentials</CardTitle>
        <CardDescription>
          Enter your Lifetime Fitness login credentials. These will be securely stored and used to book classes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            After saving your credentials, please go to the Names settings page to enter your name exactly as it appears
            on your Lifetime Fitness account.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lifetimeUsername">Lifetime Username/Email</Label>
            <Input
              id="lifetimeUsername"
              type="email"
              value={lifetimeUsername}
              onChange={(e) => setLifetimeUsername(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifetimePassword">Lifetime Password</Label>
            <Input
              id="lifetimePassword"
              type="password"
              value={lifetimePassword}
              onChange={(e) => setLifetimePassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberId">Member ID </Label>
            <Input
              id="memberId"
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="Your Lifetime member ID"
            />
            <p className="text-xs text-gray-500">
              Enter your Lifetime member ID for faster booking. This can be found on your membership card or in your
              account profile. 
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Credentials"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-gray-500">Your credentials are encrypted before being stored.</p>
        {process.env.NODE_ENV === "development" && (
          <Button type="button" variant="outline" onClick={debugCredentials} className="text-xs">
            Debug
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}





