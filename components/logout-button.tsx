"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export default function LogoutButton({ variant = "outline", size = "sm" }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        // Clear any client-side state or cached data
        localStorage.clear()
        sessionStorage.clear()
        
        // Show success message
        toast.success("Logged out successfully")
        
        // Force a hard refresh and redirect to login
        window.location.href = "/login"
        
        // As a fallback, also use the router
        setTimeout(() => {
          router.push("/login")
          router.refresh()
        }, 100)
      } else {
        throw new Error("Logout failed")
      }
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Logout failed", {
        description: "An error occurred while logging out.",
      })
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleLogout}>
      Sign Out
    </Button>
  )
}
