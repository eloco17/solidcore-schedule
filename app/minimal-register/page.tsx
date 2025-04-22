"use client"

import type React from "react"

import { useState } from "react"

export default function MinimalRegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loadingDebug, setLoadingDebug] = useState(false)

  const fetchDebugInfo = async () => {
    setLoadingDebug(true)
    try {
      const response = await fetch("/api/prisma-debug")
      const data = await response.json()
      setDebugInfo(data)
    } catch (err) {
      console.error("Error fetching debug info:", err)
    } finally {
      setLoadingDebug(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/minimal-user-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to create user")
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Minimal User Registration</h1>
      <p className="mb-4">This form tests user creation with minimal fields.</p>

      <div className="mb-6">
        <button
          onClick={fetchDebugInfo}
          disabled={loadingDebug}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        >
          {loadingDebug ? "Loading..." : "Get Prisma Debug Info"}
        </button>

        {debugInfo && (
          <div className="p-4 mb-4 rounded border bg-gray-50">
            <h3 className="font-semibold">Prisma Debug Info</h3>
            <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? "Creating..." : "Create Minimal User"}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Success!</p>
          <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
