import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { portfolioSyncStateSchema, type PortfolioSyncState } from "@/lib/portfolio-sync-types"

type UserPortfolioSyncStore = {
  users: Record<string, PortfolioSyncState>
}

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "portfolio-sync.json")

const emptyStore: UserPortfolioSyncStore = {
  users: {},
}

const ensureStoreFile = async () => {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(emptyStore, null, 2), "utf-8")
  }
}

const normalizeStore = (value: unknown): UserPortfolioSyncStore => {
  if (!value || typeof value !== "object" || !("users" in value)) {
    return emptyStore
  }

  const rawUsers = (value as { users?: unknown }).users
  if (!rawUsers || typeof rawUsers !== "object") {
    return emptyStore
  }

  const users: Record<string, PortfolioSyncState> = {}
  for (const [userId, state] of Object.entries(rawUsers as Record<string, unknown>)) {
    const parsed = portfolioSyncStateSchema.safeParse(state)
    if (parsed.success) {
      users[userId] = parsed.data
    }
  }

  return { users }
}

export const readPortfolioSyncStore = async (): Promise<UserPortfolioSyncStore> => {
  await ensureStoreFile()
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    return normalizeStore(JSON.parse(raw))
  } catch {
    return emptyStore
  }
}

export const writePortfolioSyncStore = async (store: UserPortfolioSyncStore): Promise<void> => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const normalized = normalizeStore(store)
  await fs.writeFile(DATA_PATH, JSON.stringify(normalized, null, 2), "utf-8")
}

export const hashSyncKey = (syncKey: string): string => {
  return createHash("sha256").update(syncKey).digest("hex")
}

export const getUserPortfolioState = async (syncKey: string): Promise<PortfolioSyncState | null> => {
  const store = await readPortfolioSyncStore()
  const userId = hashSyncKey(syncKey)
  return store.users[userId] ?? null
}

export const setUserPortfolioState = async (
  syncKey: string,
  state: PortfolioSyncState
): Promise<PortfolioSyncState> => {
  const parsed = portfolioSyncStateSchema.parse(state)
  const store = await readPortfolioSyncStore()
  const userId = hashSyncKey(syncKey)
  store.users[userId] = parsed
  await writePortfolioSyncStore(store)
  return parsed
}
