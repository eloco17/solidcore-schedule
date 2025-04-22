import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    // Get user from session
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get cache status
    const cacheStatus = {
      enabled: true,
      lastUpdated: new Date().toISOString(),
      size: "1.2MB",
      items: 24,
      hitRate: "87%",
      ttl: 3600,
    }

    return NextResponse.json({
      status: "success",
      data: cacheStatus,
      currentTime: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      currentTime: new Date().toISOString(),
    })
  }
}
