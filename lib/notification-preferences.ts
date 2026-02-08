import { defaultNotificationPreferences, type NotificationPreferences } from "@/lib/notification-types"

const STORAGE_KEY = "kokonutui.notification-preferences"

const readPreferences = (): NotificationPreferences => {
  if (typeof window === "undefined") {
    return defaultNotificationPreferences
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return defaultNotificationPreferences
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>
    return {
      ...defaultNotificationPreferences,
      ...parsed,
    }
  } catch {
    return defaultNotificationPreferences
  }
}

export const loadNotificationPreferences = async (): Promise<NotificationPreferences> => {
  return readPreferences()
}

export const saveNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<void> => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
