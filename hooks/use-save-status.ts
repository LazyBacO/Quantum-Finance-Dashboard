import { useMemo } from "react"
import { usePortfolio } from "@/lib/portfolio-context"

/**
 * Hook to get auto-save status information
 * @returns Object with save status and formatted time
 */
export function useSaveStatus() {
  const { lastSaved } = usePortfolio()

  const saveStatus = useMemo(() => {
    if (!lastSaved) {
      return {
        isSaved: false,
        formattedTime: "Never saved",
        timestamp: null,
      }
    }

    const savedDate = new Date(lastSaved)
    const now = new Date()
    const diffMs = now.getTime() - savedDate.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    let formattedTime = ""
    if (diffSeconds < 1) {
      formattedTime = "Just now"
    } else if (diffSeconds < 60) {
      formattedTime = `${diffSeconds}s ago`
    } else if (diffMinutes < 60) {
      formattedTime = `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      formattedTime = `${diffHours}h ago`
    } else if (diffDays < 30) {
      formattedTime = `${diffDays}d ago`
    } else {
      formattedTime = savedDate.toLocaleDateString()
    }

    return {
      isSaved: true,
      formattedTime,
      timestamp: lastSaved,
    }
  }, [lastSaved])

  return saveStatus
}
