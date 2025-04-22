"use client"

import { useState, useEffect } from "react"

export default function DatabaseTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        setLoading(true)
        const response = await fetch("/api/db-connection-test")
        const data = await response.json()
        setResult(data)
        setError(null)
      } catch (err) {
        setError(err.message || "An error occurred")
        setResult(null)
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>

      {loading && <p>Testing database connection...</p>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div
          className={`border rounded p-4 mb-4 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <h2 className="text-xl font-semibold mb-2">
            {result.success ? "✅ Connection Successful" : "❌ Connection Failed"}
          </h2>
          <p className="mb-2">{result.message || result.error}</p>

          {result.details && (
            <div className="mb-4">
              <h3 className="font-semibold">Error Details:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}

          {result.databaseInfo && (
            <div className="mb-4">
              <h3 className="font-semibold">Database Info:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(result.databaseInfo, null, 2)}
              </pre>
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-semibold">Environment:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(result.environment, null, 2)}
            </pre>
          </div>

          <p className="text-sm text-gray-500">Timestamp: {result.timestamp}</p>
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test Again
        </button>
      </div>
    </div>
  )
}

