// app/api/test-simple-register/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    console.log("Test simple registration endpoint called")

    const { name, email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user - exactly as in your original implementation
    console.log("Creating user with data:", { name, email, passwordHash: "[REDACTED]" })
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
      },
    })

    console.log("User created successfully:", user.id)

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error("Error in test simple registration:", error)

    // More detailed error response
    return NextResponse.json(
      {
        error: "Failed to register user",
        details: error.message,
        code: error.code,
        meta: error.meta,
      },
      { status: 500 },
    )
  }
}


