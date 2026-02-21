"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export default function AccessPage() {
  const [key, setKey] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const response = await fetch("/api/access/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      setError(payload.error || "Validation impossible")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-slate-700 p-6 bg-slate-900">
        <h1 className="text-xl font-semibold mb-2">Accès OpenNova Finance</h1>
        <p className="text-sm text-slate-300 mb-4">Entrez votre clé d’accès.</p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="onac_xxxxx"
          className="w-full rounded px-3 py-2 text-black"
          required
        />
        {error ? <p className="text-rose-300 text-sm mt-3">{error}</p> : null}
        <button type="submit" disabled={loading} className="mt-4 w-full bg-cyan-500 hover:bg-cyan-400 text-black rounded py-2">
          {loading ? "Validation..." : "Entrer"}
        </button>
      </form>
    </main>
  )
}
