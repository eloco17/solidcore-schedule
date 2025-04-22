import { NextResponse } from "next/server"
import { calculateScheduleTime, formatDateString, formatTimeString } from "@/lib/time-utils"

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("Authorization")
    const apiKey = process.env.SCRAPING_API_KEY

    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse the request body
    const body = await request.json()
    const { sessionId, title, day, date, startTime, endTime, location, skillLevel = "All Levels" } = body

    // Validate required fields
    if (!sessionId || !startTime || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Format the session date as YYYY-MM-DD
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // JavaScript months are 0-indexed

    // Determine the month based on the current date and the session date
    // If the session date is less than today's date, it's likely in the next month
    const sessionMonth = date < new Date().getDate() ? currentMonth + 1 : currentMonth

    // Format the date string
    const formattedDate = `${currentYear}-${sessionMonth.toString().padStart(2, "0")}-${date.toString().padStart(2, "0")}`

    console.log(`Session date: ${formattedDate}, time: ${startTime}`)

    // Calculate the exact time to schedule (7 days, 22 hours, 5 minutes before)
    let scheduleTime: Date

    try {
      // Parse the session time
      scheduleTime = calculateScheduleTime(
        formattedDate,
        startTime,
        7, // days before
        22, // hours before
        5, // minutes before
      )

      console.log(`Session time: ${formattedDate} ${startTime}`)
      console.log(`Schedule time: ${formatDateString(scheduleTime)} ${formatTimeString(scheduleTime)}`)
    } catch (error) {
      console.error("Error calculating schedule time:", error)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to calculate schedule time: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      )
    }

    // Create parameters for the Cloud Function with explicit scheduling
    const botParams = {
      desired_score: skillLevel,
      min_start_time: startTime,
      session_id: sessionId,
      title: title,
      day: day,
      date: date,
      location: location,

      // Explicit scheduling parameters
      schedule_days_before: 7,
      schedule_hours_before: 22,
      schedule_minutes_before: 5,

      // Add the exact schedule time
      exact_schedule_time: scheduleTime.toISOString(),

      // Add formatted session date/time for reference
      formatted_session_date: formattedDate,
      formatted_session_time: startTime,

      // Add Unix timestamps for precise scheduling
      session_timestamp: new Date(`${formattedDate}T${startTime.replace(" ", "")}`).getTime(),
      schedule_timestamp: scheduleTime.getTime(),

      // Force the Cloud Function to use our exact time
      use_exact_time: true,
    }

    console.log("Calling Cloud Function to create scheduler job with params:", botParams)

    // Make a direct HTTP request to the Cloud Function
    const response = await fetch("https://us-east4-el3152-cloud-2022.cloudfunctions.net/create-scheduler-job", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
      },
      body: JSON.stringify(botParams),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error response from Cloud Function:", errorText)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to schedule bot: ${errorText}`,
        },
        { status: response.status },
      )
    }

    const result = await response.json()
    console.log("Cloud Function response:", result)

    return NextResponse.json({
      success: true,
      message: result.message || "Job scheduled successfully",
      jobId: result.jobId,
      scheduledTime: scheduleTime.toISOString(),
      formattedScheduledTime: `${formatDateString(scheduleTime)} ${formatTimeString(scheduleTime)}`,
    })
  } catch (error) {
    console.error("Error in schedule-job API route:", error)
    return NextResponse.json(
      {
        success: false,
        message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}



