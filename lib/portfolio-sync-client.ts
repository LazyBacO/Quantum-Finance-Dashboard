import type { PortfolioSyncState } from "@/lib/portfolio-sync-types"

const apiRequest = async <T>(
  path: string,
  syncKey: string,
  init: RequestInit = {}
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-sync-key": syncKey,
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Portfolio sync request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export const fetchRemotePortfolioState = async (
  syncKey: string
): Promise<PortfolioSyncState | null> => {
  const data = await apiRequest<{
    state: PortfolioSyncState | null
    hasState: boolean
  }>("/api/portfolio", syncKey, { method: "GET" })

  return data.state ?? null
}

export const pushRemotePortfolioState = async (
  syncKey: string,
  state: PortfolioSyncState
): Promise<PortfolioSyncState> => {
  const data = await apiRequest<{ state: PortfolioSyncState }>("/api/portfolio", syncKey, {
    method: "PUT",
    body: JSON.stringify({ state }),
  })

  return data.state
}
