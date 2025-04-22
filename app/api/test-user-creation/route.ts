import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcrypt"

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Try creating a user with minimal fields
    try {
      const user = await db.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          hasLifetimeCredentials: false,
          lifetimeCredentials: {},
        },
      })

      return NextResponse.json({
        success: true,
        message: "Test user created successfully",
        user: {
          id: user.id,
          email: user.email,
        },
      })
    } catch (dbError) {
      console.error("Test user creation error:", dbError)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create test user",
          details: {
            message: dbError.message,
            code: dbError.code,
            meta: dbError.meta,
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in test user creation:", error)

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
