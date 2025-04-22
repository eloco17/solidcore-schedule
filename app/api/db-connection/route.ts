import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getErrorMessage } from "@/lib/error-utils"

export async function GET() {
  try {
    // Try a simple query
    const result = await db.$queryRaw`SELECT 1 as connection_test`

    // Get database connection info (without exposing credentials)
    const databaseUrl = process.env.DATABASE_URL || "Not set"
    const maskedUrl = databaseUrl.replace(/:\/\/[^:]+:[^@]+@/, "://****:****@")

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      result,
      databaseInfo: {
        url: maskedUrl,
        provider: "postgresql",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error("Database connection error:", error)

    // Use type guards to safely access error properties
    const errorMessage = getErrorMessage(error)
    const errorCode = error instanceof Error && "code" in error ? (error as any).code : undefined

    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        details: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
