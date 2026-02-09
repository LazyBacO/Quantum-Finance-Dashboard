export type SettingsData = {
  name: string
  email: string
  phone: string
  notifications: {
    weeklySummary: boolean
    thresholdAlerts: boolean
    mobileNotifications: boolean
  }
  language: "fr" | "en" | "es"
  currency: "eur" | "usd" | "gbp"
  timezone: "paris" | "new-york" | "singapore"
  sync: {
    enabled: boolean
    key: string
    autoSync: boolean
  }
}

export const SETTINGS_STORAGE_KEY = "kokonutui.settings"

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
  sync: {
    enabled: false,
    key: "",
    autoSync: true,
  },
}

const normalizeLanguage = (value: unknown): SettingsData["language"] => {
  if (value === "fr" || value === "en" || value === "es") {
    return value
  }
  return defaultSettings.language
}

const normalizeCurrency = (value: unknown): SettingsData["currency"] => {
  if (value === "eur" || value === "usd" || value === "gbp") {
    return value
  }
  return defaultSettings.currency
}

const normalizeTimezone = (value: unknown): SettingsData["timezone"] => {
  if (value === "paris" || value === "new-york" || value === "singapore") {
    return value
  }
  return defaultSettings.timezone
}

const normalize = (value: Partial<SettingsData>): SettingsData => {
  const syncRaw = (value.sync ?? {}) as Partial<SettingsData["sync"]>

  return {
    ...defaultSettings,
    ...value,
    notifications: {
      ...defaultSettings.notifications,
      ...value.notifications,
    },
    language: normalizeLanguage(value.language),
    currency: normalizeCurrency(value.currency),
    timezone: normalizeTimezone(value.timezone),
    sync: {
      enabled: typeof syncRaw.enabled === "boolean" ? syncRaw.enabled : defaultSettings.sync.enabled,
      key:
        typeof syncRaw.key === "string"
          ? syncRaw.key.trim().slice(0, 256)
          : defaultSettings.sync.key,
      autoSync:
        typeof syncRaw.autoSync === "boolean" ? syncRaw.autoSync : defaultSettings.sync.autoSync,
    },
  }
}

const readStorage = (): SettingsData => {
  if (typeof window === "undefined") {
    return defaultSettings
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) {
    return defaultSettings
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SettingsData>
    return normalize(parsed)
  } catch {
    return defaultSettings
  }
}

export const loadSettings = async (): Promise<SettingsData> => {
  return readStorage()
}

export const loadSettingsSnapshot = (): SettingsData => {
  return readStorage()
}

export const saveSettings = async (settings: SettingsData): Promise<void> => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalize(settings)))
}
