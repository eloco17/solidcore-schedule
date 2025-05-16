import { NextResponse } from "next/server"
import { SignJWT } from 'jose'
import { hash } from 'bcryptjs'
import { solidcoreDb } from '@/lib/db'

// TODO: Replace with your actual secret key
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
)

export async function POST(request: Request) {
  console.log("Registration endpoint called")

  try {
    const body = await request.json()
    const { email, password, firstName, lastName, solidcoreEmail, solidcorePassword } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !solidcoreEmail || !solidcorePassword) {
      console.log("Missing required fields")
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    console.log("Checking if user already exists...")
    const existingUser = await solidcoreDb.users.findByEmail(email)
    if (existingUser) {
      console.log("User already exists")
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }
    console.log("User does not exist, proceeding with registration")

    // Hash passwords
    console.log("Hashing passwords...")
    const hashedPassword = await hash(password, 12)
    const hashedSolidcorePassword = await hash(solidcorePassword, 12)
    console.log("Passwords hashed successfully")

    // Create user
    console.log("Creating user...")
    const user = await solidcoreDb.users.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      solidcoreEmail,
      solidcorePassword: hashedSolidcorePassword,
    })
    console.log("User created successfully")

    // Create a JWT token
    const token = await new SignJWT({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      solidcoreEmail: user.solidcoreEmail,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET)

    return NextResponse.json({
      token,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        solidcoreEmail: user.solidcoreEmail,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
