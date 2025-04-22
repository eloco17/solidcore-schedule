import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcrypt"

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Missing email or password",
          step: "validation",
        },
        { status: 400 },
      )
    }

    // Step 1: Find user by email
    let user
    try {
      user = await db.user.findUnique({
        where: { email },
      })

      if (!user) {
        return NextResponse.json(
          {
            error: "User not found",
            step: "user_lookup",
          },
          { status: 404 },
        )
      }
    } catch (dbError) {
      console.error("Database error during user lookup:", dbError)
      return NextResponse.json(
        {
          error: "Database error during user lookup",
          step: "user_lookup",
          details: String(dbError),
        },
        { status: 500 },
      )
    }

    // Step 2: Compare passwords
    try {
      const passwordMatch = await bcrypt.compare(password, user.passwordHash)

      if (!passwordMatch) {
        return NextResponse.json(
          {
            error: "Invalid password",
            step: "password_comparison",
          },
          { status: 401 },
        )
      }
    } catch (bcryptError) {
      console.error("Error comparing passwords:", bcryptError)
      return NextResponse.json(
        {
          error: "Error comparing passwords",
          step: "password_comparison",
          details: String(bcryptError),
        },
        { status: 500 },
      )
    }

    // Success - user found and password matches
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Unexpected error in login debug:", error)
    return NextResponse.json(
      {
        error: "Unexpected error",
        step: "unknown",
        details: String(error),
      },
      { status: 500 },
    )
  }
}
