"use client"

import { useEffect } from "react"

type TelemetryPayload = {
  type: "client-error" | "client-rejection" | "navigation-perf" | "web-vital"
  name: string
  value?: number
  rating?: string
  delta?: number
  id?: string
  message?: string
  stack?: string
  url?: string
  timestamp?: string
}

const postTelemetry = (payload: TelemetryPayload) => {
  const event = {
    ...payload,
    url: payload.url ?? window.location.href,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  }

  const body = JSON.stringify(event)
  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" })
    navigator.sendBeacon("/api/telemetry", blob)
    return
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    body,
  })
}

export function ObservabilityClient() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      postTelemetry({
        type: "client-error",
        name: event.error?.name || "Error",
        message: event.message,
        stack: event.error?.stack,
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      postTelemetry({
        type: "client-rejection",
        name: "UnhandledPromiseRejection",
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "Unknown promise rejection",
        stack: reason instanceof Error ? reason.stack : undefined,
      })
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onUnhandledRejection)

    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined

    if (navigationEntry) {
      postTelemetry({
        type: "navigation-perf",
        name: "navigation_total_duration",
        value: Number(navigationEntry.duration.toFixed(2)),
      })
    }

    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
    }
  }, [])

  return null
}
