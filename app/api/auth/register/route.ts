import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { db } from "@/lib/db"
import crypto from "crypto"

export async function POST(request: Request) {
  console.log("Registration endpoint called")

  try {
    // Parse request body
    let body
    try {
      const text = await request.text()
      console.log("Request body text:", text.substring(0, 100)) // Log first 100 chars
      body = JSON.parse(text)
      console.log("Request body parsed successfully")
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: parseError instanceof Error ? parseError.message : String(parseError),
        },
        { status: 400 },
      )
    }

    const { name, email, password } = body

    // Validate input
    if (!email || !password) {
      console.log("Missing required fields")
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Check if user already exists
    console.log("Checking if user already exists...")
    try {
      const existingUsers = await db.$queryRaw`
        SELECT id FROM "User" WHERE email = ${email} LIMIT 1
      `

      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        console.log("User already exists")
        return NextResponse.json(
          {
            error: "User already exists",
          },
          { status: 400 },
        )
      }
      console.log("User does not exist, proceeding with registration")
    } catch (lookupError) {
      console.error("Error checking for existing user:", lookupError)
      return NextResponse.json(
        {
          error: "Database error during user lookup",
          details: lookupError instanceof Error ? lookupError.message : String(lookupError),
        },
        { status: 500 },
      )
    }

    // Hash password
    console.log("Hashing password...")
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 10)
      console.log("Password hashed successfully")
    } catch (hashError) {
      console.error("Error hashing password:", hashError)
      return NextResponse.json(
        {
          error: "Password processing error",
          details: hashError instanceof Error ? hashError.message : String(hashError),
        },
        { status: 500 },
      )
    }

    // Create user with direct SQL
    console.log("Creating user with direct SQL...")
    try {
      // Generate a UUID for the ID field
      const uuid = crypto.randomUUID()

      // Create user with direct SQL
      await db.$executeRaw`
        INSERT INTO "User" (
          id, 
          email, 
          "passwordHash", 
          name,
          "hasLifetimeCredentials", 
          "lifetimeCredentials", 
          "createdAt", 
          "updatedAt"
        ) 
        VALUES (
          ${uuid}, 
          ${email}, 
          ${hashedPassword}, 
          ${name || null},
          false, 
          '{}', 
          CURRENT_TIMESTAMP, 
          CURRENT_TIMESTAMP
        )
      `

      console.log("User created successfully with ID:", uuid)

      return NextResponse.json({
        id: uuid,
        email,
        name,
      })
    } catch (dbError) {
      console.error("Database error during user creation:", dbError)

      return NextResponse.json(
        {
          error: "Database error during user creation",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Unhandled error in registration route:", error)

    return NextResponse.json(
      {
        error: "Failed to register user",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
