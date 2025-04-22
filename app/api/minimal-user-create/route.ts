import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcrypt"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date()

    // Try different approaches to create a user
    try {
      // Approach 1: With all required fields including updatedAt
      console.log("Trying approach with all required fields")
      const user = await db.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          hasLifetimeCredentials: false,
          lifetimeCredentials: {},
          createdAt: now,
          updatedAt: now, // This is the key field that was missing!
        },
      })

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
      })
    } catch (error) {
      console.error("User creation failed:", error)

      return NextResponse.json(
        {
          success: false,
          error: "User creation failed",
          details: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in minimal user creation:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

