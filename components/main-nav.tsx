"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { clearUserJobData } from "@/lib/cookie-utils"
import { toast } from "sonner"

interface MainNavProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    id?: string | null
  }
}

export default function MainNav({ user }: MainNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      // Clear user job data before signing out
      if (user.id) {
        clearUserJobData(user.id)
      }

      // Call our custom logout endpoint
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Logout failed")
      }

      toast.success("Logged out successfully")
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to log out")
    }
  }

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 container">
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/" ? "text-primary" : "text-muted-foreground",
            )}
          >
            Schedule
          </Link>
          <Link
            href="/settings"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/settings" ? "text-primary" : "text-muted-foreground",
            )}
          >
            Settings
          </Link>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">{user.name || user.email || "User"}</div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

