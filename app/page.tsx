"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import type { ScheduleData } from "@/lib/types"
import ApiKeyChecker from "@/components/api-key-checker"
import ScheduleDialog from "@/components/schedule-dialog"
import LoginPrompt from "@/components/login-prompt"
import StyleFixer from "@/components/style-fixer"
import { cleanupLargeCookies, getAllUserJobs, deleteJobData, checkJobStatus } from "@/lib/storage-utils"
import MainNav from "@/components/main-nav"
import { RefreshCw, Calendar, Clock } from "lucide-react"
import { SessionCard } from "@/components/session-card"
import { useSession } from "next-auth/react"
import type { Session, SessionDay, SessionStatus, SessionUser } from "@/app/types/session"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SessionStatuses {
  [key: string]: SessionStatus;
}

interface ScheduledSession {
  sessionId: string;
  status: SessionStatus;
  sessionDetails: Session;
  dayDetails: SessionDay;
}

// Simple function to check if user is logged in
function useIsLoggedIn() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache"
          },
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          if (data && data.user) {
            setIsLoggedIn(true)
            setUserData(data.user)
          } else {
            setIsLoggedIn(false)
            setUserData(null)
            window.location.href = "/login"
          }
        } else {
          setIsLoggedIn(false)
          setUserData(null)
          window.location.href = "/login"
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setIsLoggedIn(false)
        setUserData(null)
        window.location.href = "/login"
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  return { isLoggedIn, isLoading, userData }
}

export default function Page() {
  const { isLoggedIn, isLoading: authLoading, userData } = useIsLoggedIn()
  const router = useRouter()
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, SessionStatus>>({})
  const [activeTab, setActiveTab] = useState<string>("")
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedDay, setSelectedDay] = useState<SessionDay | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const previousUserId = useRef<string | null>(null)
  const { data: sessionData } = useSession()
  const user = sessionData?.user as SessionUser | undefined
  const userId = user?.id || null
  const [duprFilter, setDuprFilter] = useState<string>("")

  // Use a single ref for the mounted state
  const mounted = useRef(true)

  // Clean up cookies on mount to reduce header size
  useEffect(() => {
    try {
      // Clean up cookies that might be causing large headers
      cleanupLargeCookies()
    } catch (e) {
      console.warn("Cookie cleanup failed:", e)
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      console.log("User is not authenticated, redirecting to login page")
      window.location.href = "/login"
    }
  }, [authLoading, isLoggedIn])

  // Set up the mounted ref
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Check if user has changed and reset state if needed
  useEffect(() => {
    if (isLoggedIn && userData?.id) {
      const currentUserId = userData.id

      // If user has changed, reset state
      if (previousUserId.current && previousUserId.current !== currentUserId) {
        setSessionStatuses({})
      }

      previousUserId.current = currentUserId

      // Load user-specific job data
      const userJobs = getAllUserJobs(currentUserId)

      // Convert to session status format
      const statusMap: Record<string, any> = {}

      Object.entries(userJobs).forEach(([jobId, jobData]) => {
        if (jobData.sessionId) {
          statusMap[jobData.sessionId] = {
            exists: true,
            jobId,
            details: jobData,
          }
        }
      })

      setSessionStatuses(statusMap)
    }
  }, [isLoggedIn, userData])

  // Fetch schedule data on component mount
  useEffect(() => {
    // Only fetch if authenticated
    if (!isLoggedIn) return

    const fetchSchedule = async () => {
      try {
        setLoading(true)
        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime()
        const response = await fetch(`/api/schedule?t=${timestamp}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (!mounted.current) return

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Schedule API error:", errorData)

          if (errorData.code === "credentials-missing") {
            toast.error("Lifetime Credentials Required", {
              description: "Please add your Lifetime Fitness credentials in Settings.",
              action: {
                label: "Go to Settings",
                onClick: () => router.push("/settings"),
              },
            })
          } else {
            toast.error("Error Loading Schedule", {
              description: errorData.message || "Failed to fetch schedule data.",
            })
          }

          throw new Error(errorData.message || "Failed to fetch schedule data")
        }

        const data = await response.json()
        console.log("Schedule data received:", data)

        if (!mounted.current) return

        setScheduleData(data)

        // Set active tab to today's day
        if (data.days && data.days.length > 0) {
          const today = data.days.find((day) => day.highlight) || data.days[0]
          setActiveTab(today.name)
        }
      } catch (error) {
        if (!mounted.current) return

        console.error("Error fetching schedule:", error)
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    fetchSchedule()
  }, [isLoggedIn, router])

  // Update the session status checking
  useEffect(() => {
    if (!scheduleData?.days || !isLoggedIn || !userData?.id) return;

    const checkAllSessions = async () => {
      try {
        // Collect all session IDs
        const sessionIds = scheduleData.days.flatMap((day: SessionDay) => 
          (day.sessions || []).filter((s: Session) => s.id).map(s => s.id)
        );

        // Batch fetch status for all sessions
        const response = await fetch('/api/auth/sessions/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch session status');
        }

        const result = await response.json();
        
        // Update status map with server results
        const newStatusMap: Record<string, SessionStatus> = {};
        Object.entries(result.sessions || {}).forEach(([sessionId, status]: [string, any]) => {
          if (status.exists && status.userId === userData.id) {
            newStatusMap[sessionId] = {
              exists: true,
              status: 'scheduled',
              jobId: status.jobId,
              details: status.details
            };
          }
        });

        if (mounted.current) {
          console.log('Updating session status:', newStatusMap);
          setSessionStatuses(newStatusMap);
        }
      } catch (error) {
        console.error('Error fetching session status:', error);
      }
    };

    // Check status immediately and set up periodic checks
    checkAllSessions();
    const intervalId = setInterval(checkAllSessions, 30000); // Check every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [scheduleData, isLoggedIn, userData]);

  // Remove the localStorage-based status check effect
  useEffect(() => {
    const handleJobStatusChange = () => {
      if (scheduleData && userData?.id) {
        console.log('Job status changed event received');
        // This will trigger a re-fetch from the server
        window.dispatchEvent(new Event('session-status-refresh'));
      }
    };

    window.addEventListener("job-status-changed", handleJobStatusChange);
    window.addEventListener("session-status-refresh", handleJobStatusChange);

    return () => {
      window.removeEventListener("job-status-changed", handleJobStatusChange);
      window.removeEventListener("session-status-refresh", handleJobStatusChange);
    };
  }, [scheduleData, userData]);

  // Update the scheduledSessions calculation
  const scheduledSessions = useMemo(() => {
    if (!scheduleData?.days || !sessionStatuses) return [];
    
    console.log('Calculating scheduled sessions...');
    console.log('Current sessionStatuses:', sessionStatuses);
    
    const scheduled: ScheduledSession[] = [];
    
    // Loop through all days and sessions to find scheduled ones
    for (const day of scheduleData.days as SessionDay[]) {
      for (const session of (day.sessions || []) as Session[]) {
        if (!session.id) continue;
        
        const status = sessionStatuses[session.id];
        // Only include sessions that are confirmed scheduled on the server
        if (status?.exists && status.status === 'scheduled') {
          console.log('Found scheduled session:', {
            id: session.id,
            title: session.title,
            day: day.date,
            status: status
          });
          
          scheduled.push({
            sessionId: session.id,
            status: status,
            sessionDetails: session,
            dayDetails: day
          });
        }
      }
    }
    
    console.log(`Found ${scheduled.length} scheduled sessions`);
    return scheduled;
  }, [scheduleData, sessionStatuses]);

  const handleSessionClick = (session: Session, day: SessionDay) => {
    setSelectedSession(session)
    setSelectedDay(day)
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      // Use a small delay to prevent React errors when closing the dialog
      setTimeout(() => {
        if (mounted.current) {
          setSelectedSession(null)
          setSelectedDay(null)
        }
      }, 100)
    }
  }

  // Modified to handle tab changes without triggering 431 errors
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // New function to manually refresh and reset job status display
  const handleManualRefresh = () => {
    setRefreshing(true)

    try {
      // Clear the session status state
      setSessionStatuses({})

      // Clear localStorage items related to jobs
      if (userData?.id) {
        const userId = userData.id
        const allJobs = getAllUserJobs(userId)

        Object.keys(allJobs).forEach((jobId) => {
          deleteJobData(userId, jobId)
        })
      }

      toast.success("Display refreshed", {
        description: "All scheduled jobs have been cleared from the display.",
      })

      // Force a refresh of the parent component
      window.dispatchEvent(new CustomEvent("job-status-changed"))
    } catch (error) {
      console.error("Error refreshing display:", error)
      toast.error("Error refreshing display", {
        description: "An error occurred while refreshing the display.",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const isSessionMatchingDupr = (session: Session, duprFilter: string): boolean => {
    if (!duprFilter || !session.title) return true;
    
    const filterValue = parseFloat(duprFilter);
    if (isNaN(filterValue)) return true;

    // First check the title for DUPR level mentions
    const titleLower = session.title.toLowerCase();
    
    // Handle ranges like "3.75-4.25"
    if (titleLower.includes('-')) {
      const matches = titleLower.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
      if (matches) {
        const [min, max] = [parseFloat(matches[1]), parseFloat(matches[2])];
        return !isNaN(min) && !isNaN(max) && filterValue >= min && filterValue <= max;
      }
    }

    // Handle minimum levels like "4.0+"
    const plusMatch = titleLower.match(/(\d+\.?\d*)\+/);
    if (plusMatch) {
      const min = parseFloat(plusMatch[1]);
      return !isNaN(min) && filterValue >= min;
    }

    // Handle exact matches
    const exactMatch = titleLower.match(/(\d+\.?\d*)/);
    if (exactMatch) {
      const level = parseFloat(exactMatch[1]);
      return !isNaN(level) && Math.abs(level - filterValue) < 0.25;
    }

    // If no DUPR level found in title, check if it's "all levels"
    return titleLower.includes('all levels');
  };

  // If loading auth status, show loading state
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to login
  if (!isLoggedIn || !userData) {
    return null // Will be redirected by the useEffect in useIsLoggedIn
  }

  // Render loading skeleton
  if (loading && !scheduleData) {
    return (
      <div className="min-h-screen bg-background">
        {/* Include MainNav even during loading */}
        {userData && <MainNav user={userData} />}

        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Pickleball Schedule</h1>
          <Tabs defaultValue="loading" className="w-full">
            <TabsList className="grid grid-cols-7 mb-8">
              {Array(7)
                .fill(0)
                .map((_, i) => (
                  <TabsTrigger key={i} value={`day-${i}`} disabled>
                    <Skeleton className="h-6 w-20" />
                  </TabsTrigger>
                ))}
            </TabsList>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader className="bg-slate-50">
                      <Skeleton className="h-6 w-full" />
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 bg-slate-50">
                      <Skeleton className="h-10 w-32" />
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </Tabs>
          <StyleFixer />
        </div>
      </div>
    )
  }

  const sessions: Session[] = [
    {
      id: "1",
      title: "Pickleball Open Play: 3.0+ DUPR Optional",
      skillLevel: "3.0+",
      startTime: "6:30 AM",
      endTime: "8:00 AM",
      location: "Indoor Pickleball Courts"
    },
    {
      id: "2", 
      title: "Pickleball Open Play: All Levels Drill Session",
      skillLevel: "All Levels",
      startTime: "6:30 AM",
      endTime: "8:00 AM",
      location: "Indoor Pickleball Courts"
    },
    // Add more sessions as needed
  ]

  const today: SessionDay = {
    name: "Monday",
    date: "2024-01-22"
  }

  const renderDay = (day: SessionDay) => {
    return (
      <div key={day.date} className="space-y-4">
        {day.sessions.map((session: Session) => (
          <SessionCard
            key={session.id}
            session={session}
            day={day}
            status={sessionStatuses[session.id] || 'unscheduled'}
            onSchedule={() => handleSessionClick(session, day)}
            onCancel={() => handleSessionClick(session, day)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {userData && <MainNav user={userData} />}
      <div className="flex flex-col min-h-screen">
        <div className="container py-6 flex-none">
          <ApiKeyChecker />
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Pickleball Schedule</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="duprFilter">DUPR Level:</Label>
                <div className="flex gap-2">
                  <Input
                    id="duprFilter"
                    type="number"
                    step="0.25"
                    min="2.0"
                    max="8.0"
                    placeholder="e.g. 4.0"
                    value={duprFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDuprFilter(value);
                      // Clear filter if empty
                      if (!value) {
                        toast.info("DUPR filter cleared");
                      }
                    }}
                    className="w-24"
                  />
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      if (duprFilter) {
                        toast.success(`Filtering for DUPR level ${duprFilter}`);
                      } else {
                        setDuprFilter("");
                        toast.info("DUPR filter cleared");
                      }
                    }}
                  >
                    Filter
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Reset Display"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mt-4">
          <div className="container pb-6">
            {scheduleData && scheduleData.days && scheduleData.days.length > 0 ? (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="sticky top-0 z-10 bg-background pb-2">
                  <TabsList className="mb-8 overflow-x-auto flex whitespace-nowrap w-full no-scrollbar">
                    <div className="flex-none flex">
                      {scheduleData.days.map((day) => (
                        <TabsTrigger key={day.name} value={day.name} className={`flex-none ${day.highlight ? "font-bold" : ""}`}>
                          {day.name.slice(0, 3)} {day.date}
                        </TabsTrigger>
                      ))}
                    </div>
                    <TabsTrigger value="bookings" className="flex-none ml-auto bg-green-50">
                      My Bookings{" "}
                      {Object.values(sessionStatuses).filter((s) => s.exists).length > 0 &&
                        `(${Object.values(sessionStatuses).filter((s) => s.exists).length})`}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {scheduleData.days.map((day) => (
                  <TabsContent key={day.name} value={day.name} className="mt-0">
                    <h2 className="text-2xl font-semibold mb-6">
                      {day.name} {day.date}
                    </h2>

                    {!day.sessions || day.sessions.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-lg">
                        <p className="text-lg text-gray-500">No pickleball sessions available for this day.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {day.sessions
                          .filter((session) => isSessionMatchingDupr(session, duprFilter))
                          .map((session) => {
                            const isScheduled = session.id && sessionStatuses[session.id]?.exists

                            return (
                              <Card key={session.id} className={`overflow-hidden ${isScheduled ? 'border-green-500 border-2' : ''}`}>
                                <CardHeader className={`${isScheduled ? 'bg-green-50' : 'bg-slate-50'}`}>
                                  <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-lg">{session.title || "Untitled Session"}</CardTitle>
                                    {isScheduled && (
                                      <Badge variant="default" className="bg-green-500 text-white shrink-0">
                                        Scheduled
                                      </Badge>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  {session.subtitle && <p className="text-sm text-gray-500 mb-4">{session.subtitle}</p>}
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="font-medium">Time:</span>
                                      <span>
                                        {session.startTime || "N/A"} - {session.endTime || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium">Location:</span>
                                      <span>{session.location || "N/A"}</span>
                                    </div>
                                    {session.skillLevel && (
                                      <div className="flex justify-between">
                                        <span className="font-medium">Skill Level:</span>
                                        <span>{session.skillLevel}</span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                                <CardFooter className={`flex justify-end gap-2 ${isScheduled ? 'bg-green-50' : 'bg-slate-50'}`}>
                                  <Button 
                                    variant={isScheduled ? "outline" : "default"}
                                    onClick={() => handleSessionClick(session, day)}
                                  >
                                    {isScheduled ? "View Details" : "Schedule Bot"}
                                  </Button>
                                </CardFooter>
                              </Card>
                            )
                          })}
                      </div>
                    )}
                  </TabsContent>
                ))}

                <TabsContent value="bookings">
                  <h2 className="text-2xl font-semibold mb-6">Your Scheduled Bookings</h2>
                  
                  {!scheduleData ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                      <p className="text-lg text-gray-500">Loading schedule data...</p>
                    </div>
                  ) : scheduledSessions.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                      <p className="text-lg text-gray-500">No scheduled bookings found.</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Debug info: {Object.keys(sessionStatuses).length} sessions in status, 
                        {scheduleData.days.reduce((acc, day) => acc + day.sessions.length, 0)} total sessions
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {scheduledSessions.map(({ sessionId, status, sessionDetails, dayDetails }) => (
                        <Card key={sessionId} className="overflow-hidden border-green-500 border-2">
                          <CardHeader className="bg-green-50">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-lg">{sessionDetails?.title || "Scheduled Session"}</CardTitle>
                              <Badge variant="default" className="bg-green-500 text-white shrink-0">
                                Scheduled
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            {sessionDetails?.subtitle && (
                              <p className="text-sm text-gray-500 mb-4">{sessionDetails.subtitle}</p>
                            )}
                            <div className="space-y-3">
                              {dayDetails && (
                                <div className="flex items-center text-gray-700">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  <span>
                                    {dayDetails.name} {dayDetails.date}
                                  </span>
                                </div>
                              )}
                              {sessionDetails && (
                                <>
                                  <div className="flex items-center text-gray-700">
                                    <Clock className="h-4 w-4 mr-2" />
                                    <span>
                                      {sessionDetails.startTime || "N/A"} - {sessionDetails.endTime || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-gray-700">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="mr-2"
                                    >
                                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                      <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    <span>{sessionDetails.location || "N/A"}</span>
                                  </div>
                                  {sessionDetails.skillLevel && (
                                    <div className="flex items-center text-gray-700">
                                      <span className="mr-2">🎯</span>
                                      <span>{sessionDetails.skillLevel}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-end gap-2 bg-green-50">
                            <Button
                              variant="outline"
                              onClick={() => handleSessionClick(sessionDetails, dayDetails)}
                              className="w-full"
                            >
                              View Details
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-lg">
                <p className="text-lg text-gray-500">No schedule data available. Please try again later.</p>
              </div>
            )}

            <ScheduleDialog
              session={selectedSession}
              day={selectedDay}
              open={dialogOpen}
              onOpenChange={handleDialogOpenChange}
              userId={userId}
            />
          </div>
        </div>
      </div>
    </>
  )
}
