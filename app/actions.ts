"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { getUserCredentials } from "@/lib/user-service"
import { calculateScheduleTime } from "@/lib/time-utils"

// Use the URL that's actually being used in the logs
const SCHEDULER_SERVICE_URL =
  process.env.NEXT_PUBLIC_SCHEDULER_SERVICE_URL || "https://pickleball-scheduler-726368815164.us-east4.run.app"

// Mock user ID for development
const MOCK_USER_ID = "mock-user-id"

type ScheduleJobParams = {
  sessionId: string
  title: string
  day: string
  date: number
  startTime: string
  endTime: string
  location: string
  subtitle?: string
  primaryName?: string
  secondaryName?: string
}

// Mock function to simulate checking job status
export async function checkJobStatus(sessionId: string) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user) {
      return { exists: false, error: "Not authenticated" }
    }

    const userId = session.user.id

    // Generate the job ID with user ID included
    const jobId = `pickleball-bot-${userId}-${sessionId.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`

    console.log(`Checking job status for ${jobId}`)

    // If no cookie, make a request to the scheduler service to check if this session is scheduled
    try {
      // Use GET with query parameters instead of POST with a request body
      const endpoint = `${SCHEDULER_SERVICE_URL}/checkJobStatus?sessionId=${encodeURIComponent(
        jobId,
      )}&userId=${encodeURIComponent(userId)}`
      console.log(`Using endpoint for job status check: ${endpoint}`)

      const response = await fetch(endpoint, {
        method: "GET", // Changed from POST to GET
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response from scheduler service:", errorText)

        // For the specific queue error, provide a more helpful message
        if (
          errorText.includes("Failed to ensure queue exists") ||
          errorText.includes("Could not create or verify queue existence")
        ) {
          return {
            exists: false,
            error:
              "The scheduling service is currently experiencing issues with its task queue. Please try again later or contact support.",
            queueError: true,
          }
        }

        return { exists: false, error: errorText }
      }

      const result = await response.json()
      console.log("Job status check result:", result)

      // Return job details to be stored client-side
      if (result.exists) {
        const jobDetails = {
          jobId,
          userId,
          sessionId,
          status: "scheduled",
          checkedAt: new Date().toISOString(),
          details: result.details || {},
        }

        return {
          exists: result.exists,
          jobId: result.exists ? jobId : null,
          details: result.exists ? result.details || { jobId, userId } : null,
          source: "cloud",
          jobDetails, // Return job details to be stored client-side
        }
      }

      return {
        exists: result.exists,
        jobId: result.exists ? jobId : null,
        details: result.exists ? result.details || { jobId, userId } : null,
        source: "cloud",
      }
    } catch (error) {
      console.error("Error checking job with scheduler service:", error)
      return { exists: false, error: String(error) }
    }
  } catch (error) {
    console.error("Error checking job status:", error)
    return { exists: false, error: String(error) }
  }
}

// Mock function to simulate scheduling a pickleball bot
export async function schedulePickleballBot(params: ScheduleJobParams) {
  console.log("Server action called with params:", params)

  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user) {
      return {
        success: false,
        message: "You must be logged in to schedule a bot",
      }
    }

    // Add a timeout check to prevent hanging requests
    const startTimeMillis = Date.now()
    const MAX_EXECUTION_TIME = 25000 // 25 seconds max execution time

    // Function to check if we're approaching the timeout
    const isTimeoutApproaching = () => {
      return Date.now() - startTimeMillis > MAX_EXECUTION_TIME
    }

    const userId = session.user.id
    console.log(`User ${userId} is scheduling a bot`)

    // Get the user's Lifetime credentials
    const credentials = await getUserCredentials(userId)
    if (!credentials) {
      return {
        success: false,
        message: "Lifetime credentials not found. Please add your credentials in settings.",
        code: "credentials-missing",
      }
    }

    const { sessionId, title, day, startTime, endTime, location, subtitle, primaryName, secondaryName } = params
    let { date } = params  // Destructure date separately as mutable

    // Extract skill level from title or subtitle
    let skillLevel = "All Levels"

    // First check the subtitle which often contains the skill level
    if (subtitle && subtitle.includes("Skill Level:")) {
      const match = subtitle.match(/Skill Level:\s*([^(]*)/)
      if (match && match[1]) {
        skillLevel = match[1].trim()
      }
    }
    // If not found in subtitle, try to extract from title
    else if (title) {
      // Look for common skill level patterns in the title
      const titleLower = title.toLowerCase()

      if (titleLower.includes("all levels")) {
        skillLevel = "All Levels"
      } else if (titleLower.includes("beginner")) {
        skillLevel = "Beginner"
      } else if (titleLower.includes("intermediate")) {
        skillLevel = "Intermediate"
      } else if (titleLower.includes("advanced")) {
        skillLevel = "Advanced"
      } else {
        // Look for numeric skill levels (e.g., 3.0+, 3.5-4.0)
        const skillMatch = titleLower.match(/(\d\.\d+[+-]?|\d\.\d+\s*-\s*\d\.\d+)/g)
        if (skillMatch) {
          skillLevel = skillMatch[0].toUpperCase()
        }
      }
    }

    // Format the session date as YYYY-MM-DD
    const today = new Date()
    let sessionYear = today.getFullYear()
    let sessionMonth = today.getMonth() + 1 // JavaScript months are 0-indexed

    // Get the day of the month for today
    const currentDate = today.getDate()

    // If the target date is earlier in the month than today's date,
    // we need to look at the next month
    if (date < currentDate) {
      sessionMonth++
      // If we're in December, move to January of next year
      if (sessionMonth > 12) {
        sessionMonth = 1
        sessionYear++
      }
    }

    // If the day name indicates a future week, adjust the date accordingly
    if (day) {
      const dayIndex = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
        .indexOf(day.toUpperCase())
      if (dayIndex !== -1) {
        const targetDate = new Date(sessionYear, sessionMonth - 1, date)
        const targetDayIndex = targetDate.getDay()
        
        // If the target day of week is different from what's specified,
        // we need to move to the correct week
        if (dayIndex !== targetDayIndex) {
          // Calculate how many weeks to add to get to the correct day
          const daysToAdd = (dayIndex - targetDayIndex + 7) % 7
          targetDate.setDate(targetDate.getDate() + daysToAdd)
          
          // Update our session date values
          sessionYear = targetDate.getFullYear()
          sessionMonth = targetDate.getMonth() + 1
          date = targetDate.getDate()  // Now this will work since date is mutable
        }
      }
    }

    // Format the date string
    const formattedDate = `${sessionYear}-${sessionMonth.toString().padStart(2, "0")}-${date.toString().padStart(2, "0")}`

    // Calculate when the job should be scheduled
    let calculatedScheduleTime
    try {
      calculatedScheduleTime = calculateScheduleTime(
        formattedDate,
        startTime,
        7, // days before
        22, // hours before
        1, // minutes before
      )

      console.log("Session date/time:", formattedDate, startTime)
      console.log("Calculated schedule time:", calculatedScheduleTime.toISOString())
    } catch (error) {
      console.error("Error calculating schedule time:", error)
      throw new Error(`Failed to calculate schedule time: ${error instanceof Error ? error.message : String(error)}`)
    }

    console.log("Scheduling parameters:", {
      sessionId,
      title,
      day,
      date,
      startTime,
      endTime,
      location,
      skillLevel,
      primaryName,
      secondaryName,
    })

    // Create a unique job ID based on the session and user
    console.log(`Creating job ID with userId: ${userId} and sessionId: ${sessionId}`)
    // IMPORTANT: Always include userId in the job ID to ensure proper user isolation
    const jobId = `pickleball-bot-${userId}-${sessionId.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`
    console.log(`Generated job ID: ${jobId}`)

    // Add retry logic for better reliability
    let response
    let retries = 0
    const maxRetries = 3
    let lastError = null

    while (retries < maxRetries) {
      // Check if we're approaching the timeout before making another attempt
      if (isTimeoutApproaching()) {
        console.log("Approaching execution time limit, aborting retry attempts")
        throw new Error("Operation timed out after multiple retry attempts")
      }

      try {
        const endpoint = `${SCHEDULER_SERVICE_URL}/scheduleMultiUserPickleballBot`
        console.log(`Using endpoint: ${endpoint}`)

        // Prepare the request payload
        const payload = {
          sessionId: jobId, // Use the user-specific job ID
          scheduledTime: calculatedScheduleTime.toISOString(),
          lifetime_username: credentials.lifetimeUsername,
          lifetime_password: credentials.lifetimePassword,
          member_id: credentials.memberId || "", // Add member ID to payload
          user_id: userId,
          primary_name: primaryName || "",
          secondary_name: secondaryName || "",
          title,
          day,
          date: formattedDate,
          min_start_time: startTime,
          locationName: location,
          desired_score: skillLevel,
          calculated_schedule_time: calculatedScheduleTime.toISOString(),
        }

        console.log("Sending request with payload:", {
          ...payload,
          lifetime_password: "********", // Mask password in logs
        })

        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          // Reduce timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })

        // If successful, break out of retry loop
        if (response.ok) break

        // Get the error text for better error handling
        const errorText = await response.text()
        lastError = errorText
        console.error(`Error response (${response.status}):`, errorText)

        // Check for specific queue error
        if (
          errorText.includes("Failed to ensure queue exists") ||
          errorText.includes("Could not create or verify queue existence")
        ) {
          console.log("Queue creation error detected, this is a server-side issue")
          // We'll still retry, but we'll capture this specific error
          try {
            lastError = JSON.parse(errorText)
          } catch (e) {
            lastError = { error: "Queue creation failed", details: errorText }
          }
        }

        // If we get a 5xx error, retry
        if (response.status >= 500) {
          retries++
          console.log(`Retry ${retries}/${maxRetries} after server error ${response.status}`)
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)))
        } else {
          // For other errors (4xx), don't retry
          break
        }
      } catch (fetchError) {
        retries++
        lastError = fetchError
        console.error(`Fetch error on try ${retries}/${maxRetries}:`, fetchError)

        // Only retry on network errors or timeouts
        if (
          retries >= maxRetries ||
          !(fetchError instanceof TypeError || (fetchError instanceof Error && fetchError.name === "AbortError"))
        ) {
          throw fetchError
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)))
      }
    }

    if (!response || !response.ok) {
      const errorText = typeof lastError === "object" ? JSON.stringify(lastError) : String(lastError || "Unknown error")
      console.error("Final error response from scheduler service:", errorText)

      // Check for the specific queue error
      if (
        errorText.includes("Failed to ensure queue exists") ||
        errorText.includes("Could not create or verify queue existence")
      ) {
        // Return job details to be stored client-side in localStorage
        const jobDetails = {
          jobId,
          userId,
          sessionId,
          title,
          day,
          date,
          startTime,
          endTime,
          location,
          skillLevel,
          primaryName,
          secondaryName,
          scheduledAt: new Date().toISOString(),
          status: "pending", // Mark as pending since we couldn't confirm with the server
          error: "queue-creation-failed",
        }

        // Revalidate the schedule page to show updated status
        revalidatePath("/")

        return {
          success: false,
          message:
            "The scheduling service is currently experiencing issues with its task queue. Your booking has been saved locally, but you may need to try again later.",
          jobId,
          retries,
          serverError: true,
          queueError: true,
          details: lastError,
          pendingBooking: true,
          jobDetails, // Return job details to be stored client-side
        }
      }

      return {
        success: false,
        message: `Failed to schedule bot: ${errorText}`,
        jobId,
        retries,
        serverError: true,
      }
    }

    const result = await response.json()
    console.log("Scheduler service response:", result)

    // Return job details to be stored client-side in localStorage
    const jobDetails = {
      jobId,
      userId,
      sessionId,
      title,
      day,
      date,
      startTime,
      endTime,
      location,
      skillLevel,
      primaryName,
      secondaryName,
      scheduledAt: new Date().toISOString(),
      status: "scheduled",
    }

    // Revalidate the schedule page to show updated status
    revalidatePath("/")

    return {
      success: result.success || result.message === "Multi-user task scheduled successfully",
      message: result.message || "Job scheduled successfully",
      jobId: result.taskName || jobId,
      scheduledTime: result.scheduledTime,
      sessionOpeningTime: result.sessionOpeningTime,
      skillLevel: result.skillLevel || skillLevel,
      formattedStartTime: result.formattedStartTime || startTime,
      jobDetails, // Return job details to be stored client-side
    }
  } catch (error) {
    console.error("Error in schedulePickleballBot:", error)
    return {
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Mock function to simulate deleting a scheduled job
export async function deleteScheduledJob(sessionId: string) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user) {
      return { success: false, message: "Not authenticated" }
    }

    const userId = session.user.id

    // Generate the job ID with user ID included
    const jobId = `pickleball-bot-${userId}-${sessionId.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`

    console.log(`Deleting job ${jobId} for user ${userId}`)

    // Revalidate the schedule page to show updated status
    revalidatePath("/")

    try {
      // Use DELETE with query parameters instead of POST with a request body
      const endpoint = `${SCHEDULER_SERVICE_URL}/deleteJob?sessionId=${encodeURIComponent(
        jobId,
      )}&userId=${encodeURIComponent(userId)}`
      console.log(`Using endpoint for job deletion: ${endpoint}`)

      const response = await fetch(endpoint, {
        method: "DELETE", // Changed from POST to DELETE
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      // Parse the response
      let result
      try {
        const text = await response.text()
        result = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        result = { success: false, message: "Failed to parse response" }
      }

      // Check if the response indicates success
      if (response.ok && result.success) {
        console.log("Job deletion result:", result)
        return {
          success: true,
          message: result.message || "Job deleted successfully",
          jobDeleted: true,
        }
      } else {
        console.error("Error response from scheduler service:", result)

        // For the specific queue error, provide a more helpful message
        if (
          result.message &&
          (result.message.includes("Failed to ensure queue exists") ||
            result.message.includes("Could not create or verify queue existence"))
        ) {
          return {
            success: true,
            message:
              "Job removed from your bookings. Note: The scheduling service is currently experiencing issues with its task queue.",
            jobDeleted: true,
            queueError: true,
          }
        }

        // Even if the scheduler service returned an error, we'll still consider it a success
        // from the user's perspective since we deleted the local data
        return {
          success: true,
          message: "Job removed from your bookings. Note: " + (result.message || "Unknown error"),
          jobDeleted: true,
          cloudError: result.message,
        }
      }
    } catch (error) {
      console.error("Error deleting job with scheduler service:", error)

      // Even if the scheduler service call fails, we've already deleted the cookie
      return {
        success: true, // Still return success since we deleted the local data
        message: `Job removed from your bookings. Note: Error communicating with scheduler service: ${
          error instanceof Error ? error.message : String(error)
        }`,
        jobDeleted: true,
      }
    }
  } catch (error) {
    console.error("Error deleting scheduled job:", error)
    return {
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Mock function to test the scheduler service
export async function testScheduleJob(sessionId: string) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user) {
      return {
        success: false,
        message: "You must be logged in to test the bot",
      }
    }

    const userId = session.user.id

    // Create a unique job ID based on the session
    const jobId = `test-${userId}-${sessionId.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`

    console.log(`Testing job scheduling for ${jobId}`)

    // Get the user's Lifetime credentials for a realistic test
    const credentials = await getUserCredentials(userId)

    const endpoint = `${SCHEDULER_SERVICE_URL}/scheduleMultiUserPickleballBot`
    console.log(`Using endpoint for test: ${endpoint}`)

    // Create a test payload
    const testPayload = {
      sessionId: jobId,
      scheduledTime: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
      lifetime_username: credentials?.lifetimeUsername || "test_username",
      lifetime_password: credentials?.lifetimePassword || "test_password",
      member_id: credentials?.memberId || "", // Add member ID to test payload
      user_id: userId,
      primary_name: "Test Player",
      secondary_name: "",
      title: "Test Session",
      day: "Monday",
      date:
        new Date().getFullYear() +
        "-" +
        (new Date().getMonth() + 1).toString().padStart(2, "0") +
        "-" +
        new Date().getDate().toString().padStart(2, "0"),
      min_start_time: "10:00 AM",
      locationName: "Test Court",
      desired_score: "All Levels",
      calculated_schedule_time: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
    }

    console.log("Sending test request with payload:", {
      ...testPayload,
      lifetime_password: "********", // Mask password in logs
    })

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error response from scheduler service:", errorText)

      // For the specific queue error, provide a more helpful message
      if (
        errorText.includes("Failed to ensure queue exists") ||
        errorText.includes("Could not create or verify queue existence")
      ) {
        return {
          success: false,
          message:
            "The scheduling service is currently experiencing issues with its task queue. Please try again later or contact support.",
          queueError: true,
          statusCode: response.status,
        }
      }

      return {
        success: false,
        message: `Failed to schedule test job: ${errorText}`,
        statusCode: response.status,
      }
    }

    const result = await response.json()
    console.log("Scheduler service test response:", result)

    return {
      success: true,
      message: "Test job scheduled successfully",
      jobId,
      details: result,
    }
  } catch (error) {
    console.error("Error in testScheduleJob:", error)
    return {
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Mock function to fetch status for multiple sessions
export async function fetchSessionStatus(sessionIds: string[]) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: "Not authenticated" }
    }

    const userId = session.user.id

    // Batch check multiple sessions at once to reduce number of requests
    const results: Record<string, { exists: boolean }> = {}

    for (const id of sessionIds) {
      // Generate the job ID with user ID included
      const jobId = `pickleball-bot-${userId}-${id.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`

      try {
        // Check if this session is scheduled
        const endpoint = `${SCHEDULER_SERVICE_URL}/checkJobStatus?sessionId=${encodeURIComponent(
          jobId,
        )}&userId=${encodeURIComponent(userId)}`

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (response.ok) {
          const result = await response.json()
          results[id] = { exists: result.exists }
        } else {
          results[id] = { exists: false }
        }
      } catch (error) {
        console.error(`Error checking status for session ${id}:`, error)
        results[id] = { exists: false }
      }
    }

    return { success: true, results }
  } catch (error) {
    console.error("Error fetching session status:", error)
    return { success: false, error: "Failed to fetch session status" }
  }
}

// Mock function to fetch data for a specific day
export async function fetchDayData(dayName: string) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: "Not authenticated" }
    }

    console.log(`Fetching data for day: ${dayName}`)

    // Fetch the full schedule first
    const response = await fetch(`/api/schedule?t=${Date.now()}`, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error fetching schedule for day ${dayName}:`, errorText)
      return { success: false, error: `Failed to fetch schedule: ${response.status}` }
    }

    const scheduleData = await response.json()

    // Find the specific day in the schedule
    const dayData = scheduleData.days?.find((day) => day.name.toLowerCase() === dayName.toLowerCase())

    if (!dayData) {
      console.log(`Day ${dayName} not found in schedule`)
      return { success: false, error: `Day ${dayName} not found in schedule` }
    }

    console.log(`Successfully fetched data for day ${dayName}`)
    return {
      success: true,
      data: dayData,
      month: scheduleData.month,
      lastUpdated: scheduleData.lastUpdated || new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Error fetching day data for ${dayName}:`, error)
    return {
      success: false,
      error: `Failed to fetch data for ${dayName}: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

