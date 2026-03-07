import { defaultNotificationPreferences, type NotificationPreferences } from "@/lib/notification-types"

export const NOTIFICATION_PREFERENCES_STORAGE_KEY = "kokonutui.notification-preferences"

const normalizePreferences = (value: Partial<NotificationPreferences>): NotificationPreferences => ({
  email:
    typeof value.email === "boolean" ? value.email : defaultNotificationPreferences.email,
  push: typeof value.push === "boolean" ? value.push : defaultNotificationPreferences.push,
})

const readPreferences = (): NotificationPreferences => {
  if (typeof window === "undefined") {
    return defaultNotificationPreferences
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY)
    if (!raw) {
      return defaultNotificationPreferences
    }

    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>
    return normalizePreferences(parsed)
  } catch {
    // localStorage access can fail in private mode, blocked storage, or embedded webviews.
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

  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizePreferences(preferences)),
    )
  } catch {
    // Ignore storage write failures to keep settings interactions non-blocking.
  }
}
