import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserCredentials } from "@/lib/user-service"
import { bookLifetimeSession } from "@/lib/lifetime-service"

export async function POST(request: Request) {
  try {
    // Set a reasonable timeout for the entire operation
    let operationTimeout: NodeJS.Timeout
    operationTimeout = setTimeout(() => {
      console.error("Operation timed out after 25 seconds")
      // We can't directly throw here as it won't be caught by the outer try/catch
      // But we can log it for debugging
    }, 25000)

    // Verify user is authenticated
    const session = await getSession()
    if (!session?.user) {
      clearTimeout(operationTimeout)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body and log it for debugging
    let requestBody
    try {
      requestBody = await request.json()
      console.log("Request body:", JSON.stringify(requestBody, null, 2))
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      clearTimeout(operationTimeout)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { sessionId, sessionTitle, sessionDate, startTime, endTime, sessionTime, sessionLocation } = requestBody

    // Parse sessionTime if it exists and startTime/endTime don't
    let parsedStartTime = startTime
    let parsedEndTime = endTime

    if (!startTime && !endTime && sessionTime) {
      console.log(`Parsing combined sessionTime: "${sessionTime}"`)
      // Try to parse a format like "7:30 PM - 9:30 PM"
      const timeRegex = /(\d+:\d+\s*(?:AM|PM))\s*-\s*(\d+:\d+\s*(?:AM|PM))/i
      const match = sessionTime.match(timeRegex)

      if (match && match.length >= 3) {
        parsedStartTime = match[1].trim()
        parsedEndTime = match[2].trim()
        console.log(`Extracted startTime: "${parsedStartTime}", endTime: "${parsedEndTime}"`)
      } else {
        console.error(`Could not parse sessionTime: "${sessionTime}"`)
      }
    }

    // Validate required parameters with detailed error messages
    const missingParams = []
    if (!sessionId) missingParams.push("sessionId")
    if (!sessionTitle) missingParams.push("sessionTitle")
    if (!sessionDate) missingParams.push("sessionDate")
    if (!parsedStartTime) missingParams.push("startTime")
    if (!parsedEndTime) missingParams.push("endTime")

    if (missingParams.length > 0) {
      const errorMsg = `Missing required fields: ${missingParams.join(", ")}`
      console.error(errorMsg)
      clearTimeout(operationTimeout)
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    // Get user credentials
    let credentials
    try {
      credentials = await getUserCredentials(session.user.id)
      if (!credentials) {
        console.error(`User ${session.user.id} credentials not found`)
        clearTimeout(operationTimeout)
        return NextResponse.json(
          { error: "Lifetime credentials not found", code: "credentials-missing" },
          { status: 400 },
        )
      }
    } catch (credError) {
      console.error("Error getting user credentials:", credError)
      clearTimeout(operationTimeout)
      return NextResponse.json({ error: `Error retrieving credentials: ${credError.message}` }, { status: 500 })
    }

    // For testing, we'll simulate a booking without actually booking
    let bookingResult
    try {
      bookingResult = await bookLifetimeSession({
        username: credentials.lifetimeUsername,
        password: credentials.lifetimePassword,
        sessionId,
        sessionTitle,
        sessionDate,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        sessionLocation,
      })
    } catch (bookingError) {
      console.error("Error in bookLifetimeSession:", bookingError)
      clearTimeout(operationTimeout)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to book session",
          message: bookingError.message,
        },
        { status: 500 },
      )
    }

    // If booking was successful, schedule the job using the Cloud Function
    if (bookingResult.success) {
      try {
        // Get API key
        const apiKey = process.env.SCRAPING_API_KEY
        if (!apiKey) {
          console.error("SCRAPING_API_KEY is not set")
          clearTimeout(operationTimeout)
          return NextResponse.json({
            ...bookingResult,
            jobScheduled: false,
            error: "API key is not configured. Please set the SCRAPING_API_KEY environment variable.",
          })
        }

        // Extract day and date from sessionDate (e.g., "SATURDAY 29")
        // Handle different sessionDate formats
        let day, date

        if (typeof sessionDate === "string") {
          const parts = sessionDate.trim().split(/\s+/)
          if (parts.length >= 2) {
            day = parts[0]
            // Try to extract a number from the second part
            const dateMatch = parts[1].match(/\d+/)
            date = dateMatch ? Number.parseInt(dateMatch[0], 10) : new Date().getDate()
          } else {
            // If we can't parse it properly, use defaults
            day = "UNKNOWN"
            date = new Date().getDate()
          }
        } else {
          // If sessionDate is not a string, use defaults
          day = "UNKNOWN"
          date = new Date().getDate()
        }

        console.log(`Parsed sessionDate "${sessionDate}" into day="${day}", date=${date}`)

        // Create a unique job ID based on the session and user
        const userId = session.user.id
        console.log(`Creating job ID with userId: ${userId} and sessionId: ${sessionId}`)
        const jobId = `pickleball-bot-${userId}-${sessionId.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`
        console.log(`Generated job ID: ${jobId}`)

        // Create the payload for the Cloud Function
        const schedulerPayload = {
          session_id: sessionId,
          title: sessionTitle,
          day: day,
          date: date,
          min_start_time: parsedStartTime,
          end_time: parsedEndTime,
          location: sessionLocation || "Unknown",
          // Schedule for 7 days, 22 hours, and 5 minutes before the session
          schedule_days_before: 7,
          schedule_hours_before: 22,
          schedule_minutes_before: 5,
          // Add user-specific information
          user_id: userId,
          // Add credentials (encrypted or hashed in a real implementation)
          lifetime_username: credentials.lifetimeUsername,
          lifetime_password: credentials.lifetimePassword,
          // Add a timestamp for debugging
          request_timestamp: new Date().toISOString(),
          // Override the job ID to include the user ID
          job_id: jobId,
        }

        console.log("Calling Cloud Function to schedule job with payload:", {
          ...schedulerPayload,
          lifetime_username: "[REDACTED]",
          lifetime_password: "[REDACTED]",
        })

        // Call the Cloud Function to schedule the job
        const schedulerResponse = await fetch(
          "https://us-east4-el3152-cloud-2022.cloudfunctions.net/create-scheduler-job",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(schedulerPayload),
            signal: AbortSignal.timeout(10000), // 10 second timeout (reduced from 15)
          },
        )

        if (!schedulerResponse.ok) {
          const errorText = await schedulerResponse.text()
          console.error("Error response from Cloud Function:", errorText)
          clearTimeout(operationTimeout)
          return NextResponse.json({
            ...bookingResult,
            jobScheduled: false,
            error: `Booking successful but job scheduling failed: ${errorText}`,
            statusCode: schedulerResponse.status,
          })
        }

        const schedulerResult = await schedulerResponse.json()
        console.log("Cloud Function response:", schedulerResult)

        clearTimeout(operationTimeout)
        return NextResponse.json({
          ...bookingResult,
          jobScheduled: true,
          jobId,
          schedulerResult,
        })
      } catch (schedulingError) {
        console.error("Error scheduling job:", schedulingError)
        clearTimeout(operationTimeout)
        return NextResponse.json({
          ...bookingResult,
          jobScheduled: false,
          error: `Booking successful but job scheduling failed: ${schedulingError.message}`,
        })
      }
    }

    clearTimeout(operationTimeout)
    return NextResponse.json(bookingResult)
  } catch (error) {
    console.error("Error in schedule/book endpoint:", error)
    clearTimeout(operationTimeout)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to book session",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}



