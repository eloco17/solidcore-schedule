import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserCredentials } from "@/lib/user-service"
import { generateEnhancedMockData } from "@/lib/enhanced-mock-data" // Fallback option

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"

// Add a timeout for the GitHub fetch
const FETCH_TIMEOUT = 8000 // 8 seconds

export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Lifetime credentials
    const credentials = await getUserCredentials(session.user.id)
    if (!credentials) {
      return NextResponse.json(
        { error: "Lifetime credentials not found", code: "credentials-missing" },
        { status: 400 },
      )
    }

    // Instead of scraping, fetch from GitHub
    try {
      // Create an AbortController for the timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      // Add cache-busting parameter to the GitHub URL
      const timestamp = Date.now()
      const githubUrl = `https://raw.githubusercontent.com/eloco17/lifetime-scraper/main/data/schedule.json?t=${timestamp}`

      const githubResponse = await fetch(githubUrl, {
        cache: "no-store", // Always bypass cache
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      // Clear the timeout
      clearTimeout(timeoutId)

      if (!githubResponse.ok) {
        throw new Error(`GitHub API returned status ${githubResponse.status}`)
      }

      const scheduleData = await githubResponse.json()

      // Add metadata
      const responseData = {
        ...scheduleData,
        fromGitHub: true,
        lastUpdated: new Date().toLocaleString(),
        timestamp: new Date().toISOString(),
        userId: session.user.id,
      }

      return NextResponse.json(responseData)
    } catch (error) {
      console.error("Error fetching from GitHub:", error)

      // Fall back to mock data
      const mockData = generateEnhancedMockData()

      return NextResponse.json({
        ...mockData,
        source: "fallback-mock",
        error: error.message,
        lastUpdated: new Date().toLocaleString(),
        timestamp: new Date().toISOString(),
        userId: session.user.id,
      })
    }
  } catch (error) {
    console.error("Error fetching user schedule:", error)
    return NextResponse.json({ error: "Failed to fetch schedule", message: error.message }, { status: 500 })
  }
}

