import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

export async function GET() {
  try {
    // Create a new Prisma client instance specifically for this test
    // This bypasses any global configuration issues
    const testClient = new PrismaClient({
      log: ["query", "error", "warn"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })

    // Test basic connection
    console.log("Testing database connection...")
    await testClient.$connect()
    console.log("Connection successful!")

    // Try a simple query
    const testResult = await testClient.$queryRaw`SELECT 1 as connection_test`
    console.log("Query successful:", testResult)

    // Get database connection info (without exposing credentials)
    const databaseUrl = process.env.DATABASE_URL || "Not set"
    const maskedUrl = databaseUrl.replace(/:\/\/[^:]+:[^@]+@/, "://****:****@")

    // Check if we have a direct URL for migrations
    const directUrl = process.env.DIRECT_URL || "Not set"
    const maskedDirectUrl = directUrl.replace(/:\/\/[^:]+:[^@]+@/, "://****:****@")

    // Check for connection pooling
    const hasPooling = databaseUrl.includes("pgbouncer=true") || databaseUrl.includes("connection_limit")

    // Get all environment variables (without sensitive values)
    // Fix: Add proper type assertions to avoid TypeScript errors
    const envVars = Object.keys(process.env).reduce((acc: Record<string, string>, key) => {
      if (key.includes("DATABASE") || key.includes("POSTGRES") || key.includes("PG_")) {
        // Add type assertion to ensure TypeScript knows this is a string
        const envValue = process.env[key] as string
        acc[key] = envValue.replace(/:\/\/[^:]+:[^@]+@/, "://****:****@")
      } else if (
        !key.includes("SECRET") &&
        !key.includes("KEY") &&
        !key.includes("TOKEN") &&
        !key.includes("PASSWORD")
      ) {
        acc[key] = process.env[key] as string
      } else {
        acc[key] = "[REDACTED]"
      }
      return acc
    }, {})

    // Clean up
    await testClient.$disconnect()

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
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL === "1" ? "Yes" : "No",
        region: process.env.VERCEL_REGION || "Unknown",
      },
      envVars,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database connection error:", error)

    // Get error details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
      code: (error as any).code,
      stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
    }

    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        details: errorDetails,
        // Include environment info for debugging
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL === "1" ? "Yes" : "No",
          region: process.env.VERCEL_REGION || "Unknown",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
