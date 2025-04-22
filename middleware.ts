import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

export async function middleware(request: NextRequest) {
  // Exclude these paths from authentication check
  const publicPaths = ["/login", "/register"]
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Get both types of tokens
  const authToken = request.cookies.get("auth-token")
  const sessionToken = request.cookies.get("next-auth.session-token")
  const authStatus = request.cookies.get("auth-status")

  // Check if user is authenticated with either method
  const isAuthenticated = await checkAuthentication(authToken, sessionToken)

  // If it's a public path and user is authenticated, redirect to home
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next()
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If authenticated, allow access
  return NextResponse.next()
}

async function checkAuthentication(authToken?: { value: string } | null, sessionToken?: { value: string } | null): Promise<boolean> {
  if (!authToken && !sessionToken) {
    return false
  }

  // Try JWT token first
  if (authToken) {
    try {
      await jwtVerify(
        authToken.value,
        new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
      )
      return true
    } catch {
      // JWT verification failed, continue to check session token
    }
  }

  // Try session token
  if (sessionToken) {
    try {
      const sessionData = JSON.parse(Buffer.from(sessionToken.value, "base64").toString())
      if (sessionData?.user) {
        return true
      }
    } catch {
      // Session token parsing failed
    }
  }

  return false
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

