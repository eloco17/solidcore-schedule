import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = cookies()
    
    // Clear all auth-related cookies
    cookieStore.delete("next-auth.session-token")
    cookieStore.delete("__Secure-next-auth.session-token")
    cookieStore.delete("next-auth.callback-url")
    cookieStore.delete("next-auth.csrf-token")
    cookieStore.delete("auth-token")
    cookieStore.delete("auth-status")

    // Set headers to clear cookies on client side as well
    const headers = new Headers()
    headers.append("Set-Cookie", `next-auth.session-token=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`)
    headers.append("Set-Cookie", `__Secure-next-auth.session-token=; Path=/; Secure; expires=Thu, 01 Jan 1970 00:00:00 GMT`)
    headers.append("Set-Cookie", `auth-token=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`)
    headers.append("Set-Cookie", `auth-status=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`)

    return NextResponse.json(
      { success: true },
      { headers }
    )
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

