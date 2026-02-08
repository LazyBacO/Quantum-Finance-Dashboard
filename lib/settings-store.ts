export type SettingsData = {
  name: string
  email: string
  phone: string
  notifications: {
    weeklySummary: boolean
    thresholdAlerts: boolean
    mobileNotifications: boolean
  }
  language: string
  currency: string
  timezone: string
}

const STORAGE_KEY = "kokonutui.settings"

export const defaultSettings: SettingsData = {
  name: "",
  email: "",
  phone: "",
  notifications: {
    weeklySummary: true,
    thresholdAlerts: false,
    mobileNotifications: true,
  },
  language: "fr",
  currency: "eur",
  timezone: "paris",
}

const readStorage = (): SettingsData => {
  if (typeof window === "undefined") {
    return defaultSettings
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return defaultSettings
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SettingsData>
    return {
      ...defaultSettings,
      ...parsed,
      notifications: {
        ...defaultSettings.notifications,
        ...parsed.notifications,
      },
    }
  } catch {
    return defaultSettings
  }
}

export const loadSettings = async (): Promise<SettingsData> => {
  return readStorage()
}

export const saveSettings = async (settings: SettingsData): Promise<void> => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
