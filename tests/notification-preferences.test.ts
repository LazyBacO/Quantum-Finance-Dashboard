import { afterEach, describe, expect, it } from "vitest"

import {
  loadNotificationPreferences,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  saveNotificationPreferences,
} from "@/lib/notification-preferences"
import { defaultNotificationPreferences } from "@/lib/notification-types"

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

describe("notification-preferences storage resilience", () => {
  it("returns defaults when localStorage access throws", async () => {
    installWindow(
      makeStorage({
        getItem: () => {
          throw new Error("SecurityError")
        },
      }),
    )

    await expect(loadNotificationPreferences()).resolves.toEqual(defaultNotificationPreferences)
  })

  it("does not throw when localStorage write fails", async () => {
    installWindow(
      makeStorage({
        setItem: () => {
          throw new Error("QuotaExceededError")
        },
      }),
    )

    await expect(saveNotificationPreferences(defaultNotificationPreferences)).resolves.toBeUndefined()
  })

  it("normalizes malformed persisted values", async () => {
    installWindow(
      makeStorage({
        getItem: (key: string) => {
          if (key !== NOTIFICATION_PREFERENCES_STORAGE_KEY) {
            return null
          }

          return JSON.stringify({ email: "yes", push: false })
        },
      }),
    )

    await expect(loadNotificationPreferences()).resolves.toEqual({
      email: true,
      push: false,
    })
  })
})
