"use client"

import { useState, useEffect } from "react"

export default function SchemaCheckPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkSchema() {
      try {
        setLoading(true)
        const response = await fetch("/api/db-schema-check")
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

    checkSchema()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Database Schema Check</h1>

      {loading && <p>Checking database schema...</p>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div
          className={`border rounded p-4 mb-4 ${
            result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">
            {result.success ? "✅ Schema Check Successful" : "❌ Schema Check Failed"}
          </h2>

          {result.schema && (
            <div className="mb-4">
              <h3 className="font-semibold">Tables:</h3>
              <ul className="list-disc pl-5 mb-4">
                <li>User Table: {result.schema.userTableExists ? "✅ Exists" : "❌ Missing"}</li>
                <li>Booking Table: {result.schema.bookingTableExists ? "✅ Exists" : "❌ Missing"}</li>
                <li>Account Table: {result.schema.accountTableExists ? "✅ Exists" : "❌ Missing"}</li>
                <li>Session Table: {result.schema.sessionTableExists ? "✅ Exists" : "❌ Missing"}</li>
              </ul>

              {result.schema.userTableExists && (
                <div className="mb-4">
                  <h3 className="font-semibold">User Table Columns:</h3>
                  <div className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left p-2">Column Name</th>
                          <th className="text-left p-2">Data Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.schema.userColumns.map((column, index) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                            <td className="p-2">{column.column_name}</td>
                            <td className="p-2">{column.data_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h3 className="font-semibold">All Tables:</h3>
              <div className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                <ul className="list-disc pl-5">
                  {result.schema.allTables.map((table, index) => (
                    <li key={index}>{table.table_name}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500">Timestamp: {result.timestamp}</p>
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Check Again
        </button>
      </div>
    </div>
  )
}
