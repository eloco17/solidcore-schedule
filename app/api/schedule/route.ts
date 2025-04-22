import { NextResponse } from "next/server"
import { generateEnhancedMockData } from "@/lib/enhanced-mock-data" // Keep as fallback
import { getSession } from "@/lib/auth"
import { getUserCredentials } from "@/lib/user-service"

// Always run this route on the server
export const dynamic = "force-dynamic"
export const revalidate = 0

// Add a timeout for the GitHub fetch
const FETCH_TIMEOUT = 8000 // 8 seconds
const GITHUB_URL = "https://raw.githubusercontent.com/eloco17/lifetime-scraper/main/data/schedule.json"

interface ScheduleData {
  days: Array<any>
  [key: string]: any
}

interface ResponseData extends ScheduleData {
  fromGitHub?: boolean
  source?: string
  error?: string
  lastUpdated: string
  timestamp: string
  userId: string
  _debug?: { error?: string }
}

export async function GET(request: Request) {
  let currentSession = null
  const url = new URL(request.url)
  const debug = url.searchParams.has('debug')
  const forceRefresh = url.searchParams.get("refresh") === "true"
  const useMock = url.searchParams.get("mock") === "true"

  console.log("Schedule API route called at", new Date().toISOString())

  try {
    // Verify user is authenticated
    currentSession = await getSession() as { user: { id: string } } | null
    if (!currentSession?.user) {
      console.log("Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has Lifetime credentials
    const credentials = await getUserCredentials(currentSession.user.id)
    console.log(`Credentials check for user ${currentSession.user.id}:`, credentials ? "Found" : "Not found")

    // If user doesn't have credentials, return a specific response
    if (!credentials && !useMock) {
      console.log(`User ${currentSession.user.id} does not have Lifetime credentials`)
      return NextResponse.json(
        { 
          error: "Please add your Lifetime Fitness credentials in Settings to view the schedule",
          code: "credentials-required",
          requiresCredentials: true
        },
        { status: 403 }
      )
    }

    // If mock data is requested or we're in development, return mock data
    if (useMock || process.env.NODE_ENV === "development") {
      console.log("Using mock data...")
      const mockData = generateEnhancedMockData()
      return NextResponse.json({
        ...mockData,
        source: "mock-data",
        lastUpdated: new Date().toLocaleString(),
        timestamp: new Date().toISOString(),
        userId: currentSession.user.id,
        isMockData: true
      })
    }

    // Try to fetch data from GitHub with a timeout
    console.log(`Fetching data from GitHub for user ${currentSession.user.id}...`)

    try {
      // Create an AbortController for the timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      // Add cache-busting query parameter
      const timestamp = Date.now()
      const githubUrl = `${GITHUB_URL}?t=${timestamp}`
      console.log(`Fetching from URL: ${githubUrl}`)

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
        console.log(`Failed to fetch data from GitHub: ${githubResponse.status}`)
        throw new Error(`GitHub API returned status ${githubResponse.status}`)
      }

      const text = await githubResponse.text()
      console.log(`Received data length: ${text.length} bytes`)

      // Validate the response is valid JSON
      let githubData: ScheduleData
      try {
        const parsedData = JSON.parse(text)
        if (!parsedData.days || !Array.isArray(parsedData.days)) {
          throw new Error("Invalid schedule data format")
        }
        githubData = parsedData
      } catch (parseError) {
        console.error("Error parsing GitHub response:", parseError)
        throw new Error("Invalid schedule data received")
      }

      console.log(`Successfully fetched data from GitHub for user ${currentSession.user.id}`)
      console.log(`Schedule contains ${githubData.days.length} days`)

      // Return the GitHub data
      const responseData: ResponseData = {
        ...githubData,
        fromGitHub: true,
        lastUpdated: new Date().toLocaleString(),
        timestamp: new Date().toISOString(),
        userId: currentSession.user.id,
      }

      // Remove debug info if not requested
      if (!debug && responseData._debug) {
        delete responseData._debug
      }

      return NextResponse.json(responseData)
    } catch (fetchError: unknown) {
      // Check if it's a timeout error
      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          console.error("GitHub fetch timed out after", FETCH_TIMEOUT, "ms")
        } else {
          console.error("Error fetching or parsing GitHub data:", fetchError.message)
        }
      }

      // Fall back to mock data
      throw fetchError
    }
  } catch (error: unknown) {
    console.error("Error in schedule API route:", error instanceof Error ? error.message : "Unknown error")

    // Fall back to mock data
    console.log("Falling back to mock data due to error")
    const mockData = generateEnhancedMockData()

    return NextResponse.json({
      ...mockData,
      source: "fallback-mock",
      error: error instanceof Error ? error.message : "Unknown error",
      lastUpdated: new Date().toLocaleString(),
      timestamp: new Date().toISOString(),
      userId: currentSession?.user?.id || "unknown",
      _debug: debug ? { error: error instanceof Error ? error.stack : "Unknown error" } : undefined,
    })
  }
}

