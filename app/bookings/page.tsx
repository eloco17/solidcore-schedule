"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import StyleFixer from "@/components/style-fixer"

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        // Check for auth cookie
        const hasAuthCookie =
          document.cookie.includes("next-auth.session-token") ||
          document.cookie.includes("__Secure-next-auth.session-token")

        if (!hasAuthCookie) {
          setIsLoggedIn(false)
          setLoading(false)
          // Redirect to login
          window.location.href = "/login"
          return
        }

        // Try to fetch user data
        const response = await fetch("/api/auth/session", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data && data.user) {
            setIsLoggedIn(true)
            setUserData(data.user)
            fetchBookings(data.user.id)
          } else {
            setIsLoggedIn(false)
            // Redirect to login
            window.location.href = "/login"
          }
        } else {
          setIsLoggedIn(false)
          // Redirect to login
          window.location.href = "/login"
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setIsLoggedIn(false)
        // Redirect to login
        window.location.href = "/login"
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const fetchBookings = async (userId: string) => {
    try {
      setLoading(true)
      // Mock data for now
      const mockBookings = [
        {
          id: "1",
          title: "Pickleball All Levels",
          date: "2023-05-15",
          time: "10:00 AM - 11:00 AM",
          location: "Main Court",
          status: "Confirmed",
        },
        {
          id: "2",
          title: "Pickleball Intermediate",
          date: "2023-05-17",
          time: "2:00 PM - 3:00 PM",
          location: "Court 3",
          status: "Pending",
        },
      ]

      setBookings(mockBookings)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast.error("Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your bookings...</span>
        <StyleFixer />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to view your bookings.</p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
        <StyleFixer />
      </div>
    )
  }

  return (
    <div className="container py-8">
      <StyleFixer />
      <h1 className="text-3xl font-bold mb-8">Your Bookings</h1>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">You don't have any bookings yet.</p>
            <Button onClick={() => router.push("/")}>View Schedule</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle>{booking.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Date:</span> {booking.date}
                  </p>
                  <p>
                    <span className="font-medium">Time:</span> {booking.time}
                  </p>
                  <p>
                    <span className="font-medium">Location:</span> {booking.location}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={
                        booking.status === "Confirmed"
                          ? "text-green-600"
                          : booking.status === "Pending"
                            ? "text-amber-600"
                            : "text-red-600"
                      }
                    >
                      {booking.status}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
