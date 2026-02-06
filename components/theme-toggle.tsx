"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative p-2 hover:bg-accent/60 rounded-full transition-colors"
    >
      <Sun className="h-5 w-5 text-muted-foreground transition-all dark:hidden" />
      <Moon className="h-5 w-5 text-muted-foreground transition-all hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}

