import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const cookieStore = cookies()
    
    // Debug: Log all cookies
    console.log("All cookies:", cookieStore.getAll().map(c => ({ name: c.name, value: c.value })))
    
    const authToken = cookieStore.get("auth-token")
    const sessionToken = cookieStore.get("next-auth.session-token")
    const secureSessionToken = cookieStore.get("__Secure-next-auth.session-token")
    const authStatus = cookieStore.get("auth-status")

    console.log("Auth token:", authToken?.value ? "present" : "missing")
    console.log("Session token:", sessionToken?.value ? "present" : "missing")
    console.log("Secure session token:", secureSessionToken?.value ? "present" : "missing")
    console.log("Auth status:", authStatus?.value)

    // Set headers to prevent caching
    const headers = new Headers({
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    })

    // No tokens found
    if (!authToken && !sessionToken && !secureSessionToken) {
      console.log("No auth tokens found")
      return NextResponse.json(
        { user: null },
        { headers }
      )
    }

    if (authToken) {
      // Handle JWT token
      try {
        const { payload } = await jwtVerify(
          authToken.value,
          new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
        )

        console.log("JWT verification successful")
        return NextResponse.json({
          user: {
            id: payload.userId,
            email: payload.email,
            name: payload.name,
          },
        }, { headers })
      } catch (jwtError) {
        console.error("JWT verification error:", jwtError)
        // Continue to try session token if JWT fails
      }
    }

    // Try both session tokens
    const tokenToUse = sessionToken || secureSessionToken
    if (tokenToUse) {
      try {
        const sessionData = JSON.parse(Buffer.from(tokenToUse.value, "base64").toString())
        console.log("Session data:", { ...sessionData, user: sessionData?.user ? "present" : "missing" })
        
        if (sessionData?.user) {
          // Check if session is expired
          if (sessionData.expires && new Date(sessionData.expires) < new Date()) {
            console.log("Session expired")
            return NextResponse.json({ user: null }, { headers })
          }

          // Valid session found
          return NextResponse.json({
            user: sessionData.user,
            expires: sessionData.expires
          }, { headers })
        }
      } catch (sessionError) {
        console.error("Session parsing error:", sessionError)
      }
    }

    // If all auth methods fail, return null user
    console.log("All auth methods failed")
    return NextResponse.json({ user: null }, { headers })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}

