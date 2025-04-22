"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function LoginDebugPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)

  const testDirectLogin = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    setRawResponse(null)

    try {
      const response = await fetch("/api/auth/login-debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      // Store the raw response text
      const responseText = await response.text()
      setRawResponse(responseText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        setResult(data)
      } catch (parseError) {
        setError(`Failed to parse response as JSON: ${parseError.message}`)
        return
      }

      if (!response.ok) {
        setError(`API returned status ${response.status}: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      setError(`Request failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testNextAuthCredentials = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    setRawResponse(null)

    try {
      // This is a direct fetch to the NextAuth credentials endpoint
      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          callbackUrl: window.location.origin,
          json: true,
        }),
      })

      // Store the raw response text
      const responseText = await response.text()
      setRawResponse(responseText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        setResult(data)
      } catch (parseError) {
        setError(`Failed to parse response as JSON: ${parseError.message}`)
        return
      }

      if (!response.ok) {
        setError(`API returned status ${response.status}: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      setError(`Request failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Login Debug Tool</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Login Credentials</CardTitle>
          <CardDescription>Test your login credentials directly against the API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 items-start">
          <div className="flex space-x-4 w-full">
            <Button onClick={testDirectLogin} disabled={loading || !email || !password} className="flex-1">
              Test Direct API
            </Button>
            <Button
              onClick={testNextAuthCredentials}
              disabled={loading || !email || !password}
              variant="outline"
              className="flex-1"
            >
              Test NextAuth Endpoint
            </Button>
          </div>

          {loading && <p className="text-sm">Loading...</p>}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="w-full">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="bg-slate-100 p-4 rounded text-xs overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {rawResponse && (
            <div className="w-full">
              <h3 className="font-medium mb-2">Raw Response:</h3>
              <pre className="bg-slate-100 p-4 rounded text-xs overflow-auto max-h-60">{rawResponse}</pre>
            </div>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NextAuth Configuration</CardTitle>
          <CardDescription>Information about your NextAuth setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Important NextAuth URLs:</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                <li>
                  <code>/api/auth/signin</code> - Sign in page
                </li>
                <li>
                  <code>/api/auth/callback/credentials</code> - Credentials callback
                </li>
                <li>
                  <code>/api/auth/session</code> - Get current session
                </li>
                <li>
                  <code>/api/auth/csrf</code> - Get CSRF token
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium">Common Issues:</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                <li>405 Method Not Allowed - The endpoint doesn't support the HTTP method you're using</li>
                <li>Unexpected end of JSON input - The response isn't valid JSON</li>
                <li>CSRF token mismatch - NextAuth requires a valid CSRF token for POST requests</li>
                <li>Invalid credentials - Email/password combination is incorrect</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
