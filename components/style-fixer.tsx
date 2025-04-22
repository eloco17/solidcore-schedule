"use client"

import { useEffect, useState } from "react"

export default function StyleFixer() {
  const [stylesLoaded, setStylesLoaded] = useState(false)

  useEffect(() => {
    // Check if styles are loaded
    const checkStyles = () => {
      const body = document.body
      const computedStyle = window.getComputedStyle(body)
      const bgColor = computedStyle.backgroundColor

      // If background color is not the default white, styles are loaded
      if (bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "rgb(255, 255, 255)") {
        setStylesLoaded(true)
        return true
      }
      return false
    }

    // If styles aren't loaded immediately, try to force them
    if (!checkStyles()) {
      // Try to force styles to load
      const forceStyles = () => {
        // Create a new stylesheet
        const style = document.createElement("style")
        style.textContent = `
          body {
            background-color: var(--background);
            color: var(--foreground);
          }
          .bg-background {
            background-color: var(--background);
          }
          .text-foreground {
            color: var(--foreground);
          }
        `
        document.head.appendChild(style)

        // Force a reflow
        document.body.offsetHeight
      }

      forceStyles()

      // Check again after a short delay
      const timer = setTimeout(() => {
        if (!checkStyles()) {
          // If styles still aren't loaded, try one more time
          forceStyles()

          // Add inline styles as a last resort
          document.body.style.backgroundColor = "hsl(0, 0%, 100%)"
          document.body.style.color = "hsl(222.2, 84%, 4.9%)"
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [])

  return null
}

