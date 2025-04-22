"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { toast } from "sonner"
import MainNav from "@/components/main-nav"

export default function NamesSettingsPage() {
  const { data: session, status } = useSession()
  const [primaryName, setPrimaryName] = useState("")
  const [secondaryName, setSecondaryName] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      fetchNames()
    }
  }, [status])

  const fetchNames = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/user/names")
      if (response.ok) {
        const data = await response.json()
        setPrimaryName(data.primaryName || "")
        setSecondaryName(data.secondaryName || "")
      }
    } catch (error) {
      console.error("Error fetching names:", error)
      toast.error("Failed to load your names")
    } finally {
      setLoading(false)
    }
  }

  const saveNames = async () => {
    try {
      setIsSaving(true)
      const response = await fetch("/api/user/names", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primaryName,
          secondaryName,
        }),
      })

      if (response.ok) {
        toast.success("Names saved successfully")
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to save names")
      }
    } catch (error) {
      console.error("Error saving names:", error)
      toast.error("Failed to save names")
    } finally {
      setIsSaving(false)
    }
  }

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (status === "unauthenticated") {
    return <div>Please sign in to access this page</div>
  }

  return (
    <>
      <MainNav user={session?.user} />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Name Settings</h1>

        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Enter your name exactly as it appears on your Lifetime Fitness account. The bot uses this to find and check
            your name during registration.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Your Names for Lifetime Fitness</CardTitle>
            <CardDescription>
              Enter the names that appear on your Lifetime Fitness account. These names will be used to identify your
              checkboxes when booking classes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryName">Primary Name</Label>
              <Input
                id="primaryName"
                value={primaryName}
                onChange={(e) => setPrimaryName(e.target.value)}
                placeholder="e.g. John"
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                Enter your first name only, exactly as it appears on your Lifetime account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryName">Secondary Name (Optional)</Label>
              <Input
                id="secondaryName"
                value={secondaryName}
                onChange={(e) => setSecondaryName(e.target.value)}
                placeholder="e.g. Johnny"
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                If you have an alternate name that might appear on your account, enter it here
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveNames} disabled={loading || isSaving}>
              {isSaving ? "Saving..." : "Save Names"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}

