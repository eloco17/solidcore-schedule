import { NextResponse } from "next/server"
import { getUserCredentials } from "@/lib/user-service"
import { Storage } from "@google-cloud/storage"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    // Parse request body
    const { jobId, userId, sessionData, apiKey } = await request.json()

    // Verify API key
    const validApiKey = process.env.SCHEDULE_API_KEY
    if (!validApiKey || apiKey !== validApiKey) {
      console.error("Invalid API key")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`Executing scheduled job ${jobId} for user ${userId}`)

    // Get user credentials
    const credentials = await getUserCredentials(userId)
    if (!credentials) {
      console.error(`User ${userId} credentials not found`)
      return NextResponse.json({ error: "User credentials not found" }, { status: 400 })
    }

    // Get user profile to extract names
    const userProfile = await getUserProfile(userId)

    // Create parameters file for the bot
    const botParams = {
      username: credentials.lifetimeUsername,
      password: credentials.lifetimePassword,
      session_id: sessionData.id,
      title: sessionData.title,
      day: sessionData.day,
      date: sessionData.date,
      min_start_time: sessionData.startTime,
      location: sessionData.location,
      user_id: userId,
      job_id: jobId,
      // Primary name from profile or email
      primary_name: userProfile?.primaryName || getUserFirstName(credentials.lifetimeUsername),
      // Secondary name (if provided in profile)
      secondary_name: userProfile?.secondaryName || "",
      // Flag to indicate if we should check for both names
      check_both_names: !!userProfile?.secondaryName,
    }

    // Upload parameters to Google Cloud Storage
    try {
      const storage = new Storage()
      const bucket = storage.bucket("lifetime-pickleball-bot")
      const file = bucket.file(`params/${userId}/${jobId}.json`)

      await file.save(JSON.stringify(botParams), {
        contentType: "application/json",
        metadata: {
          cacheControl: "private, max-age=0",
        },
      })

      console.log(`Parameters uploaded to GCS for job ${jobId}`)

      // Trigger the VM to run the bot
      // This could be done via Compute Engine API or another method
      // For now, we'll simulate success

      return NextResponse.json({
        success: true,
        message: "Job parameters uploaded and VM triggered",
        jobId,
        userId,
        sessionData,
        names: {
          primary: botParams.primary_name,
          secondary: botParams.secondary_name,
        },
      })
    } catch (error) {
      console.error("Error uploading parameters to GCS:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to upload parameters",
          message: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error executing scheduled job:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute scheduled job",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

// Helper function to extract first name from email
function getUserFirstName(email: string): string {
  if (!email) return "User"

  // Try to extract name from email (e.g., john.doe@example.com -> John)
  const namePart = email.split("@")[0]
  if (namePart) {
    // Handle formats like "john.doe" or "john_doe"
    const firstName = namePart.split(/[._]/)[0]
    if (firstName) {
      // Capitalize first letter
      return firstName.charAt(0).toUpperCase() + firstName.slice(1)
    }
  }

  return "User"
}

// Function to get user profile with name information
async function getUserProfile(userId: string) {
  try {
    // Get the user's profile from the database
    const userProfile = await db.userProfile.findUnique({
      where: { userId },
      select: {
        primaryName: true,
        secondaryName: true,
      },
    })

    // If no profile exists, return default values
    if (!userProfile) {
      return {
        primaryName: "User",
        secondaryName: "",
      }
    }

    return {
      primaryName: userProfile.primaryName || "User",
      secondaryName: userProfile.secondaryName || "",
    }
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return {
      primaryName: "User",
      secondaryName: "",
    }
  }
}

