import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Try a simple database query
    const testResult = await db.$queryRaw`SELECT 1 as test`

    // Get database connection info (without exposing credentials)
    const databaseUrl = process.env.DATABASE_URL || "Not set"
    const maskedUrl = databaseUrl.replace(/:\/\/[^:]+:[^@]+@/, "://****:****@")

    // Check if we have a direct URL for migrations
    const directUrl = process.env.DIRECT_URL || "Not set"
    const maskedDirectUrl = directUrl.replace(/:\/\/[^:]+:[^@]+@/, "://****:****@")

    // Check for connection pooling
    const hasPooling = databaseUrl.includes("pgbouncer=true") || databaseUrl.includes("connection_limit")

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      testResult,
      databaseInfo: {
        provider: "postgresql",
        url: maskedUrl,
        directUrl: maskedDirectUrl,
        hasPooling,
        connectionPooling: hasPooling ? "Enabled" : "Not configured",
      },
      environment: process.env.NODE_ENV,
      vercel: process.env.VERCEL === "1" ? "Yes" : "No",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database connection error:", error)

    // Get error details
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }

    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        details: errorDetails,
        timestamp: new Date().toISOString(),
        // Include environment info for debugging
        environment: process.env.NODE_ENV,
        vercel: process.env.VERCEL === "1" ? "Yes" : "No",
      },
      { status: 500 },
    )
  }
}


