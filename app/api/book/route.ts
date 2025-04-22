import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserCredentials } from "@/lib/user-service"

export async function POST(request: Request) {
  try {
    // Get user from session
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { sessionId, title, day, date, startTime, endTime, location } = body

    if (!sessionId || !title || !day || !date || !startTime || !endTime || !location) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user's Lifetime credentials
    const credentials = await getUserCredentials(session.user.id)
    if (!credentials) {
      return NextResponse.json({ error: "Lifetime credentials not found" }, { status: 400 })
    }

    // Mock booking for now
    return NextResponse.json({
      status: "success",
      message: "Booking successful",
      bookingId: `booking-${Date.now()}`,
      currentTime: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      currentTime: new Date().toISOString(),
    })
  }
}


