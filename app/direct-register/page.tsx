"use client"

import type React from "react"

import { useState } from "react"

export default function DirectRegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [checkingDb, setCheckingDb] = useState(false)

  const checkDatabase = async () => {
    setCheckingDb(true)
    try {
      const response = await fetch("/api/db-connection")
      const data = await response.json()
      setDbStatus(data)
    } catch (err) {
      setDbStatus({ success: false, error: err.message })
    } finally {
      setCheckingDb(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // First check database connection
      await checkDatabase()

      // Make the registration request
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      // Try to parse the response as JSON
      let data
      try {
        const text = await response.text()
        console.log("Response text:", text.substring(0, 100)) // Log first 100 chars
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${parseError.message}`)
      }

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || data.details || "Failed to register user")
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Direct Registration Test</h1>
      <p className="mb-4">This form tests the registration endpoint directly with detailed error reporting.</p>

      <div className="mb-6">
        <button
          onClick={checkDatabase}
          disabled={checkingDb}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        >
          {checkingDb ? "Checking..." : "Check Database Connection"}
        </button>

        {dbStatus && (
          <div
            className={`p-4 mb-4 rounded border ${
              dbStatus.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}
          >
            <h3 className="font-semibold">
              {dbStatus.success ? "✅ Database Connected" : "❌ Database Connection Failed"}
            </h3>
            <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(dbStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
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
          {loading ? "Registering..." : "Register"}
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
