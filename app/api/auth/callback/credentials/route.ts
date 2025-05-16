import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import { cookies } from "next/headers"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    // Find user in solidcoreUser table
    const user = await prisma.solidcoreUser.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Create a session object
    const session = {
      user: {
        id: user.id,
        email: user.email,
        name: user.firstName + ' ' + user.lastName,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }

    // Set the session cookie
    cookies().set({
      name: "next-auth.session-token",
      value: Buffer.from(JSON.stringify(session)).toString("base64"),
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "strict",
      priority: "high"
    })

    // Set a non-httpOnly cookie for client-side detection
    cookies().set({
      name: "auth-status",
      value: "authenticated",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "strict",
      priority: "high"
    })

    // Set additional headers
    const headers = new Headers()
    headers.append("Cache-Control", "no-store, no-cache, must-revalidate")
    headers.append("Pragma", "no-cache")

    // Return success response with headers
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.firstName + ' ' + user.lastName,
        },
      },
      {
        headers,
        status: 200
      }
    )
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
} 