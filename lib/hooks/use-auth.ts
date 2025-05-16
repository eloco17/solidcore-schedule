import { useState, useEffect } from "react"

interface User {
  id: string
  name?: string | null
  email?: string | null
}

interface AuthState {
  user: User | null
  isLoading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setAuthState({ user: data.user, isLoading: false })
          } else {
            setAuthState({ user: null, isLoading: false })
          }
        } else {
          setAuthState({ user: null, isLoading: false })
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setAuthState({ user: null, isLoading: false })
      }
    }

    checkAuth()
  }, [])

  return authState
} 