import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Check if the User table exists
    const userTableExists = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'User'
      );
    `

    // Check if the required columns exist in the User table
    let userColumns = []
    if (userTableExists[0].exists) {
      userColumns = await db.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'User';
      `
    }

    // Check if other required tables exist
    const bookingTableExists = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'Booking'
      );
    `

    // Check for NextAuth tables
    const accountTableExists = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'Account'
      );
    `

    const sessionTableExists = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'Session'
      );
    `

    // Get all tables in the database
    const allTables = await db.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `

    return NextResponse.json({
      success: true,
      schema: {
        userTableExists: userTableExists[0].exists,
        userColumns,
        bookingTableExists: bookingTableExists[0].exists,
        accountTableExists: accountTableExists[0].exists,
        sessionTableExists: sessionTableExists[0].exists,
        allTables,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error checking database schema:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check database schema",
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
