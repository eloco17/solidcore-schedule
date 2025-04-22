"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export default function DebugCSS() {
  const [cssLoaded, setCssLoaded] = useState(false)
  const [cssFiles, setCssFiles] = useState<string[]>([])
  const [tailwindLoaded, setTailwindLoaded] = useState(false)
  const [authStatus, setAuthStatus] = useState<string>("unknown")
  const [cookies, setCookies] = useState<string[]>([])
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if CSS is loaded
    const styleSheets = document.styleSheets
    const loadedCss: string[] = []

    let hasRules = false
    let hasTailwind = false

    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const sheet = styleSheets[i]
        if (sheet.cssRules.length > 0) {
          hasRules = true

          // Check for Tailwind classes
          for (let j = 0; j < sheet.cssRules.length; j++) {
            const rule = sheet.cssRules[j]
            if (
              rule.cssText &&
              (rule.cssText.includes(".bg-background") || rule.cssText.includes(".text-foreground"))
            ) {
              hasTailwind = true
              break
            }
          }
        }

        if (sheet.href) {
          loadedCss.push(sheet.href)
        }
      } catch (e) {
        // CORS error when trying to access cross-origin stylesheet
        console.log("Could not access stylesheet", e)
      }
    }

    setCssLoaded(hasRules)
    setTailwindLoaded(hasTailwind)
    setCssFiles(loadedCss)

    // Test if Tailwind classes are working
    const testDiv = document.createElement("div")
    testDiv.className = "hidden bg-red-500"
    document.body.appendChild(testDiv)
    const computed = window.getComputedStyle(testDiv)
    const bgColor = computed.backgroundColor
    setTailwindLoaded(bgColor === "rgb(239, 68, 68)" || bgColor === "rgba(239, 68, 68, 1)")
    document.body.removeChild(testDiv)

    // Check auth status from cookies
    const authCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("next-auth.session-token=") || row.startsWith("auth-status="))

    setAuthStatus(authCookie ? "cookie-found" : "no-cookie")
    setCookies(document.cookie.split("; "))
  }, [])

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 9999,
        background: cssLoaded ? (tailwindLoaded ? "green" : "orange") : "red",
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "12px",
        maxWidth: "300px",
        maxHeight: "200px",
        overflow: "auto",
      }}
    >
      <h4 style={{ margin: 0 }}>Debug Info</h4>
      <p>Path: {pathname}</p>
      <p>Query: {searchParams.toString()}</p>
      <p>CSS Loaded: {cssLoaded ? "Yes" : "No"}</p>
      <p>Tailwind Working: {tailwindLoaded ? "Yes" : "No"}</p>
      <p>Auth Status: {authStatus}</p>
      <p>CSS Files: {cssFiles.length}</p>
      <p>Cookies: {cookies.length}</p>
      <div style={{ marginTop: "10px" }}>
        <button
          onClick={() => window.location.reload(true)}
          style={{
            background: "white",
            color: "black",
            border: "none",
            padding: "5px 10px",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Force Refresh
        </button>
      </div>
    </div>
  )
}
