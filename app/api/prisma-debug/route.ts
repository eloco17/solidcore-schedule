import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Get the User model metadata from Prisma
    const userModelMeta = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position;
    `

    // Get all tables in the database
    const allTables = await db.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `

    // Try to get a sample user (if any exist)
    let sampleUser = null
    try {
      sampleUser = await db.user.findFirst({
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          hasLifetimeCredentials: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // If we found a user, mask sensitive data
      if (sampleUser) {
        sampleUser.passwordHash = "[REDACTED]"
        if (sampleUser.email) {
          sampleUser.email = sampleUser.email.replace(/(.{3})(.*)(@.*)/, "$1***$3")
        }
      }
    } catch (error) {
      console.error("Error fetching sample user:", error)
    }

    return NextResponse.json({
      success: true,
      userModelMeta,
      allTables,
      sampleUser,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in Prisma debug endpoint:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get Prisma metadata",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
