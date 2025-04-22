import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// Instead of exporting cachedData directly, we'll use a variable inside the module
let cachedData: any = null
let lastUpdated: Date | null = null

export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return the cached data if available
    if (cachedData && lastUpdated) {
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        lastUpdated: lastUpdated.toISOString(),
      })
    }

    // If no cached data, return an empty response
    return NextResponse.json({
      success: false,
      message: "No cached data available",
    })
  } catch (error) {
    console.error("Error in update-schedule GET:", error)
    return NextResponse.json({ error: "Failed to get schedule data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const data = await request.json()

    // Update the cached data
    cachedData = data
    lastUpdated = new Date()

    return NextResponse.json({
      success: true,
      message: "Schedule data updated successfully",
      timestamp: lastUpdated.toISOString(),
    })
  } catch (error) {
    console.error("Error in update-schedule POST:", error)
    return NextResponse.json({ error: "Failed to update schedule data" }, { status: 500 })
  }
}

