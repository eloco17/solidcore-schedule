// app/api/user/credentials/route.ts
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { encryptCredentials, saveUserCredentials } from "@/lib/user-service"

// Better build detection that works even if NODE_ENV is 'production' locally
const isBuildTime = process.env.VERCEL_BUILD_STEP === '1' || process.env.VERCEL_ENV === 'preview'

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export async function POST(request: Request) {
  try {
    // During build time, return a mock response
    if (isBuildTime) {
      return NextResponse.json({ success: true, mock: true })
    }

    // Verify user is authenticated using NextAuth session
    const session = await getSession()
    const user = session?.user as SessionUser | undefined

    if (!user?.id) {
      console.error("No valid session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const { lifetimeUsername, lifetimePassword, memberId } = await request.json()

    if (!lifetimeUsername || !lifetimePassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Saving credentials for user:", user.id)

    // Encrypt credentials
    const encryptedCredentials = await encryptCredentials({
      lifetimeUsername,
      lifetimePassword,
      memberId,
    })

    // Save to database using the user ID from the session
    await saveUserCredentials(user.id, encryptedCredentials)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving credentials:", error)
    
    // During build time, don't fail with an error
    if (isBuildTime) {
      return NextResponse.json({ success: true, mock: true })
    }
    
    return NextResponse.json({ 
      error: "Failed to save credentials",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}