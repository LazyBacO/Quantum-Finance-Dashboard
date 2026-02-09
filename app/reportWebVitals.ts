import type { NextWebVitalsMetric } from "next/app"

const postMetric = (metric: NextWebVitalsMetric) => {
  const enrichedMetric = metric as NextWebVitalsMetric & {
    rating?: string
    delta?: number
  }

  const body = JSON.stringify({
    type: "web-vital",
    name: metric.name,
    value: metric.value,
    rating: enrichedMetric.rating,
    delta: enrichedMetric.delta,
    id: metric.id,
    timestamp: new Date().toISOString(),
  })

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" })
    navigator.sendBeacon("/api/telemetry", blob)
    return
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body,
  })
}

export function reportWebVitals(metric: NextWebVitalsMetric) {
  postMetric(metric)
}
