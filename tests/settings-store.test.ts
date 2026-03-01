import { afterEach, describe, expect, it } from "vitest"

import {
  defaultSettings,
  loadSettingsSnapshot,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from "@/lib/settings-store"

type WindowWithStorage = Window & {
  localStorage: Storage
}

function makeStorage(overrides: {
  getItem?: (key: string) => string | null
  setItem?: (key: string, value: string) => void
}): Storage {
  return {
    length: 0,
    clear: () => {},
    key: () => null,
    removeItem: () => {},
    getItem: overrides.getItem ?? (() => null),
    setItem: overrides.setItem ?? (() => {}),
  }
}

const installWindow = (storage: WindowWithStorage["localStorage"]) => {
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: undefined,
    configurable: true,
    writable: true,
  })
})

describe("settings-store storage resilience", () => {
  it("returns default settings when localStorage access throws", () => {
    installWindow(
      makeStorage({
        getItem: () => {
          throw new Error("SecurityError")
        },
        setItem: () => {
          throw new Error("not used")
        },
      }),
    )

    expect(loadSettingsSnapshot()).toEqual(defaultSettings)
  })

  it("does not throw when localStorage write fails", async () => {
    installWindow(
      makeStorage({
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError")
        },
      }),
    )

    await expect(saveSettings(defaultSettings)).resolves.toBeUndefined()
  })

  it("still reads and normalizes valid persisted data", () => {
    installWindow(
      makeStorage({
        getItem: (key: string) => {
          if (key !== SETTINGS_STORAGE_KEY) {
            return null
          }

          return JSON.stringify({
            language: "en",
            marketData: {
              provider: "massive",
            },
          })
        },
        setItem: () => {
          throw new Error("not used")
        },
      }),
    )

    const snapshot = loadSettingsSnapshot()
    expect(snapshot.language).toBe("en")
    expect(snapshot.marketData.provider).toBe("massive")
  })
})
