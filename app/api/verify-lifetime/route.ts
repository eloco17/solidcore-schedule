import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { verifyLifetimeCredentials } from "@/lib/lifetime-service"

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const { lifetimeUsername, lifetimePassword } = await request.json()

    if (!lifetimeUsername || !lifetimePassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify credentials with Lifetime
    const isValid = await verifyLifetimeCredentials(lifetimeUsername, lifetimePassword)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Lifetime Fitness credentials" }, { status: 400 })
    }

    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    console.error("Error verifying credentials:", error)
    return NextResponse.json({ error: "Failed to verify credentials" }, { status: 500 })
  }
}

