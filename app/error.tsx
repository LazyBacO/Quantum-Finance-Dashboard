"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    const payload = {
      type: "client-error",
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }

    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  }, [error])

  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border/60 bg-background/80 p-6">
          <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
          <p className="text-sm text-muted-foreground">
            L&apos;incident a été enregistré. Vous pouvez relancer le rendu.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md border border-border/60 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
