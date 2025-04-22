import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { checkJobStatus } from "@/app/actions"
import { SessionUser } from "@/app/types/session"

export async function POST(request: Request) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = session.user as SessionUser
    if (!user.id) {
      return NextResponse.json({ error: "Invalid user session" }, { status: 401 })
    }

    // Get session IDs from request body
    const { sessionIds } = await request.json()
    if (!Array.isArray(sessionIds)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // Check status for each session
    const sessions: Record<string, any> = {}
    
    await Promise.all(
      sessionIds.map(async (sessionId) => {
        try {
          // Generate the job ID with user ID included for proper isolation
          const jobId = `pickleball-bot-${user.id}-${sessionId.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`
          
          // Check status with the scheduler service
          const status = await checkJobStatus(sessionId)
          
          sessions[sessionId] = {
            exists: status.exists,
            jobId: status.exists ? jobId : null,
            details: status.details,
            userId: user.id // Include userId for verification
          }
        } catch (error) {
          console.error(`Error checking status for session ${sessionId}:`, error)
          sessions[sessionId] = {
            exists: false,
            error: String(error)
          }
        }
      })
    )

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error in sessions status endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 