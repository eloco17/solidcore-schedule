import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { cookies } from "next/headers"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  // Remove PrismaAdapter if you only want JWT sessions, or update to use solidcoreUser if needed
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize({ email, password }) {
        try {
          console.log("Authorize called with email:", email);

          if (!email || !password) {
            console.error("Missing credentials");
            return null;
          }

          const user = await prisma.solidcoreUser.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            console.error("User not found or missing password");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            password,
            user.password
          );

          if (!isPasswordValid) {
            console.error("Invalid password");
            return null;
          }

          console.log("User authenticated:", user.email);

          // Return only id and email for testing
          return {
            id: user.id,
            email: user.email,
          };
        } catch (err) {
          console.error("Authorize error:", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
      }
      return session
    },
    async redirect() {
      return "/"
    }
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}

export const getAuthSession = () => getServerSession(authOptions)

// Get session from NextAuth or custom cookie
export async function getSession() {
  try {
    // First try to get the session from NextAuth
    const session = await getServerSession(authOptions)
    if (session?.user) {
      return session
    }

    // Get all cookies
    const cookieStore = cookies()
    
    // If NextAuth session is not available, try to get it from the custom cookie
    const sessionCookie = cookieStore.get("next-auth.session-token") || 
                         cookieStore.get("__Secure-next-auth.session-token")
    
    if (!sessionCookie?.value) {
      return null
    }

    try {
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString())

      // Validate session data structure
      if (!sessionData?.user?.id || !sessionData?.user?.email) {
        return null
      }

      // Check if session is expired
      if (!sessionData.expires || new Date(sessionData.expires) < new Date()) {
        return null
      }

      // Verify the user exists in the database
      const user = await prisma.solidcoreUser.findUnique({
        where: { id: sessionData.user.id },
        select: { id: true, email: true, firstName: true, lastName: true },
      })

      if (!user) {
        return null
      }

      return {
        user,
        expires: sessionData.expires,
      }
    } catch (error) {
      console.error("Error parsing session:", error)
      return null
    }
  } catch (error) {
    console.error("Error in getSession:", error)
    return null
  }
}
