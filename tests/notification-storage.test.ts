import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { afterEach, describe, expect, it, vi } from "vitest"

const originalCwd = process.cwd()

afterEach(() => {
  process.chdir(originalCwd)
})

describe("notification storage", () => {
  it("retourne un fallback sans écraser le fichier si notifications.json est invalide", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "opennova-notification-storage-"))
    process.chdir(tempRoot)

    const dataDir = path.join(tempRoot, "data")
    await mkdir(dataDir, { recursive: true })
    await writeFile(path.join(dataDir, "notifications.json"), "{invalid-json", "utf-8")

    vi.resetModules()
    const { readNotificationStore } = await import("@/lib/notification-storage")

    const store = await readNotificationStore()
    expect(store.tasks.length).toBeGreaterThan(0)
    expect(store.alerts.length).toBeGreaterThan(0)

    const persistedRaw = await readFile(path.join(dataDir, "notifications.json"), "utf-8")
    expect(persistedRaw).toBe("{invalid-json")
  })
})
