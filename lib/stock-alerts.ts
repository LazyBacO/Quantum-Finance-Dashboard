import type { StockAIRecommendation } from "@/lib/stock-analysis-engine"
import { createPrefixedId } from "@/lib/random-id"

export interface StockAlert {
  id: string
  symbol: string
  type: "price-target" | "rsi-signal" | "volatility" | "trend" | "news"
  condition: string
  triggerValue?: number
  currentValue?: number
  severity: "info" | "warning" | "critical"
  isActive: boolean
  createdAt: string
  triggeredAt?: string
  message: string
  action?: {
    type: "buy" | "sell" | "hold"
    reason: string
  }
}

export interface AlertPreferences {
  enabledAlerts: boolean
  notificationMethod: "email" | "push" | "both" | "none"
  severityThreshold: "info" | "warning" | "critical"
  tradingHoursOnly: boolean
  symbols: string[]
  priceChangeThreshold: number
  volumeSurgeThreshold: number
  rsiThreshold: number
}

export interface MarketAlertInput {
  symbol: string
  currentPrice: number
  previousClose: number
  rsi: number
  volume: number
}

export interface ProactiveSignal {
  symbol: string
  severity: "info" | "warning" | "critical"
  headline: string
  recommendation: string
}

const STORAGE_KEY = "stock_alerts_v2"
const LEGACY_STORAGE_KEY = "stock_alerts_v1"
const PREFERENCES_KEY = "stock_alert_preferences_v1"
const ALERT_COOLDOWN_MS = 20 * 60 * 1000

const nowIso = () => new Date().toISOString()

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"

const createId = () => {
  return createPrefixedId("alert")
}

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase()

const severityRank: Record<StockAlert["severity"], number> = {
  info: 1,
  warning: 2,
  critical: 3,
}

const normalizeAlert = (alert: StockAlert): StockAlert => ({
  ...alert,
  id: alert.id || createId(),
  symbol: normalizeSymbol(alert.symbol),
  type: alert.type,
  condition: alert.condition || "",
  severity: alert.severity,
  isActive: Boolean(alert.isActive),
  createdAt: new Date(alert.createdAt || nowIso()).toISOString(),
  triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt).toISOString() : undefined,
  triggerValue: typeof alert.triggerValue === "number" ? alert.triggerValue : undefined,
  currentValue: typeof alert.currentValue === "number" ? alert.currentValue : undefined,
  message: alert.message || `${normalizeSymbol(alert.symbol)} alert`,
  action: alert.action,
})

const getDefaultPreferences = (): AlertPreferences => ({
  enabledAlerts: true,
  notificationMethod: "push",
  severityThreshold: "warning",
  tradingHoursOnly: false,
  symbols: [],
  priceChangeThreshold: 5,
  volumeSurgeThreshold: 50,
  rsiThreshold: 30,
})

const migrateLegacyAlerts = () => {
  if (!canUseStorage()) return
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    window.localStorage.setItem(STORAGE_KEY, legacy)
  }
}

export function loadAlerts(): StockAlert[] {
  if (!canUseStorage()) return []
  migrateLegacyAlerts()

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((value): value is StockAlert => typeof value === "object" && value !== null)
      .map((value) => normalizeAlert(value))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.warn("Failed to load alerts:", error)
    return []
  }
}

export function saveAlerts(alerts: StockAlert[]): void {
  if (!canUseStorage()) return

  try {
    const normalized = alerts.map((alert) => normalizeAlert(alert))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch (error) {
    console.error("Failed to save alerts:", error)
  }
}

export function loadAlertPreferences(): AlertPreferences {
  if (!canUseStorage()) return getDefaultPreferences()
  try {
    const stored = window.localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return getDefaultPreferences()
    const parsed = JSON.parse(stored) as Partial<AlertPreferences>
    const defaults = getDefaultPreferences()
    return {
      enabledAlerts: typeof parsed.enabledAlerts === "boolean" ? parsed.enabledAlerts : defaults.enabledAlerts,
      notificationMethod:
        parsed.notificationMethod === "email" ||
        parsed.notificationMethod === "push" ||
        parsed.notificationMethod === "both" ||
        parsed.notificationMethod === "none"
          ? parsed.notificationMethod
          : defaults.notificationMethod,
      severityThreshold:
        parsed.severityThreshold === "info" ||
        parsed.severityThreshold === "warning" ||
        parsed.severityThreshold === "critical"
          ? parsed.severityThreshold
          : defaults.severityThreshold,
      tradingHoursOnly: typeof parsed.tradingHoursOnly === "boolean" ? parsed.tradingHoursOnly : defaults.tradingHoursOnly,
      symbols: Array.isArray(parsed.symbols) ? parsed.symbols.map((symbol) => normalizeSymbol(symbol)) : defaults.symbols,
      priceChangeThreshold:
        typeof parsed.priceChangeThreshold === "number" && Number.isFinite(parsed.priceChangeThreshold)
          ? Math.max(0.1, parsed.priceChangeThreshold)
          : defaults.priceChangeThreshold,
      volumeSurgeThreshold:
        typeof parsed.volumeSurgeThreshold === "number" && Number.isFinite(parsed.volumeSurgeThreshold)
          ? Math.max(1, parsed.volumeSurgeThreshold)
          : defaults.volumeSurgeThreshold,
      rsiThreshold:
        typeof parsed.rsiThreshold === "number" && Number.isFinite(parsed.rsiThreshold)
          ? Math.max(5, Math.min(45, parsed.rsiThreshold))
          : defaults.rsiThreshold,
    }
  } catch (error) {
    console.warn("Failed to load alert preferences:", error)
    return getDefaultPreferences()
  }
}

export function saveAlertPreferences(prefs: AlertPreferences): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
  } catch (error) {
    console.error("Failed to save alert preferences:", error)
  }
}

export { getDefaultPreferences }

export function createAlert(
  symbolInput: string,
  type: StockAlert["type"],
  condition: string,
  message: string,
  severity: StockAlert["severity"] = "warning",
  triggerValue?: number
): StockAlert {
  const symbol = normalizeSymbol(symbolInput)
  const alert: StockAlert = normalizeAlert({
    id: createId(),
    symbol,
    type,
    condition,
    triggerValue,
    severity,
    isActive: true,
    createdAt: nowIso(),
    message,
  })

  const alerts = loadAlerts()
  alerts.unshift(alert)
  saveAlerts(alerts.slice(0, 2000))
  return alert
}

export function updateAlert(alertId: string, updates: Partial<StockAlert>): StockAlert | null {
  const alerts = loadAlerts()
  const index = alerts.findIndex((alert) => alert.id === alertId)
  if (index < 0) return null

  const next = normalizeAlert({
    ...alerts[index],
    ...updates,
  })
  alerts[index] = next
  saveAlerts(alerts)
  return next
}

export function deleteAlert(alertId: string): boolean {
  const alerts = loadAlerts()
  const next = alerts.filter((alert) => alert.id !== alertId)
  if (next.length === alerts.length) return false
  saveAlerts(next)
  return true
}

export function getActiveAlertsForSymbol(symbolInput: string): StockAlert[] {
  const symbol = normalizeSymbol(symbolInput)
  return loadAlerts().filter((alert) => alert.symbol === symbol && alert.isActive)
}

export function triggerAlert(alertId: string, currentValue?: number): StockAlert | null {
  return updateAlert(alertId, {
    triggeredAt: nowIso(),
    currentValue,
    isActive: false,
  })
}

export function getRecentTriggeredAlerts(minutesAgo = 60): StockAlert[] {
  const cutoff = Date.now() - minutesAgo * 60_000
  return loadAlerts().filter((alert) => {
    if (!alert.triggeredAt) return false
    return new Date(alert.triggeredAt).getTime() >= cutoff
  })
}

export function evaluateAlertCondition(
  alert: StockAlert,
  currentPrice: number,
  rsi: number,
  volume: number,
  previousClose: number
): boolean {
  const safePreviousClose = previousClose > 0 ? previousClose : currentPrice
  const priceChangePct = ((currentPrice - safePreviousClose) / safePreviousClose) * 100

  switch (alert.type) {
    case "price-target": {
      if (typeof alert.triggerValue !== "number" || !Number.isFinite(alert.triggerValue)) {
        return false
      }
      const condition = alert.condition.toLowerCase()
      if (condition.includes("<=") || condition.includes("under") || condition.includes("below")) {
        return currentPrice <= alert.triggerValue
      }
      return currentPrice >= alert.triggerValue
    }
    case "rsi-signal": {
      const numeric = Number(alert.condition.match(/\d+(\.\d+)?/)?.[0] ?? 70)
      if (alert.condition.toLowerCase().includes("overbought")) {
        return rsi >= numeric
      }
      if (alert.condition.toLowerCase().includes("oversold")) {
        return rsi <= numeric
      }
      return rsi <= Math.min(numeric, 30) || rsi >= Math.max(100 - numeric, 70)
    }
    case "volatility": {
      const threshold = typeof alert.triggerValue === "number" ? alert.triggerValue : 5
      return Math.abs(priceChangePct) >= threshold
    }
    case "trend": {
      const normalized = alert.condition.toLowerCase()
      if (normalized.includes("up") || normalized.includes("hauss")) {
        return priceChangePct >= 2
      }
      if (normalized.includes("down") || normalized.includes("baiss")) {
        return priceChangePct <= -2
      }
      return Math.abs(priceChangePct) >= 2
    }
    case "news":
      return alert.isActive
    default:
      return false
  }
}

export function formatAlertNotification(
  alert: StockAlert,
  currentPrice?: number,
  locale: "fr" | "en" = "fr"
): string {
  const severityLabel =
    alert.severity === "critical" ? (locale === "fr" ? "CRITIQUE" : "CRITICAL") : alert.severity.toUpperCase()

  if (locale === "en") {
    return [
      `Alert ${alert.symbol}`,
      `Type: ${alert.type}`,
      `Severity: ${severityLabel}`,
      `Message: ${alert.message}`,
      currentPrice ? `Current Price: $${currentPrice.toFixed(2)}` : "",
      `Created: ${new Date(alert.createdAt).toLocaleString("en-US")}`,
    ]
      .filter(Boolean)
      .join("\n")
  }

  return [
    `Alerte ${alert.symbol}`,
    `Type: ${alert.type}`,
    `Severite: ${severityLabel}`,
    `Message: ${alert.message}`,
    currentPrice ? `Prix actuel: $${currentPrice.toFixed(2)}` : "",
    `Creee: ${new Date(alert.createdAt).toLocaleString("fr-FR")}`,
  ]
    .filter(Boolean)
    .join("\n")
}

const passesSeverityThreshold = (
  severity: StockAlert["severity"],
  threshold: AlertPreferences["severityThreshold"]
) => severityRank[severity] >= severityRank[threshold]

const canSendBrowserNotification = () =>
  typeof window !== "undefined" && typeof Notification !== "undefined"

export async function sendNotification(
  alert: StockAlert,
  currentPrice?: number,
  method: "push" | "email" = "push"
): Promise<boolean> {
  try {
    const message = formatAlertNotification(alert, currentPrice)

    if (method === "email") {
      console.log("Stock alert email simulation:", message)
      return true
    }

    if (canSendBrowserNotification() && Notification.permission === "granted") {
      new Notification(`OpenNova Alert ${alert.symbol}`, {
        body: alert.message,
        tag: alert.id,
      })
      return true
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("stock-alert", {
          detail: { alert, message },
        })
      )
    }
    return true
  } catch (error) {
    console.error("Failed to send stock alert notification:", error)
    return false
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!canSendBrowserNotification()) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false
  const permission = await Notification.requestPermission()
  return permission === "granted"
}

export function createAutomaticAlert(
  symbolInput: string,
  signal: StockAIRecommendation["signal"],
  priceTarget: number,
  riskScore: number
): StockAlert {
  const symbol = normalizeSymbol(symbolInput)
  if (signal === "strong-buy" || signal === "buy") {
    return createAlert(
      symbol,
      "price-target",
      "target-upside",
      `Signal ${signal.toUpperCase()} detecte. Surveille la cible ${priceTarget.toFixed(2)}.`,
      "info",
      priceTarget
    )
  }

  if (signal === "sell" || signal === "strong-sell") {
    return createAlert(
      symbol,
      "trend",
      "trend-down",
      `Signal ${signal.toUpperCase()} detecte. Verifier la position active.`,
      riskScore >= 70 ? "critical" : "warning"
    )
  }

  return createAlert(symbol, "volatility", "watch", "Conserver et surveiller la volatilite.", "info")
}

export function upsertAutomaticAlertsFromRecommendations(recommendations: StockAIRecommendation[]) {
  const existing = loadAlerts()
  const next = [...existing]

  for (const rec of recommendations) {
    const symbol = normalizeSymbol(rec.symbol)
    const hasActive = next.some(
      (alert) =>
        alert.isActive &&
        alert.symbol === symbol &&
        (alert.type === "price-target" || alert.type === "trend")
    )
    if (hasActive) continue
    next.unshift(createAutomaticAlert(symbol, rec.signal, rec.priceTarget, rec.riskScore))
  }

  saveAlerts(next.slice(0, 2000))
  return next
}

export function runAlertEngine(
  snapshots: MarketAlertInput[],
  locale: "fr" | "en" = "fr"
): { triggered: StockAlert[]; proactive: ProactiveSignal[] } {
  const prefs = loadAlertPreferences()
  if (!prefs.enabledAlerts) {
    return { triggered: [], proactive: [] }
  }

  const now = Date.now()
  const alerts = loadAlerts()
  const triggered: StockAlert[] = []
  const proactive: ProactiveSignal[] = []

  for (const snapshot of snapshots) {
    const symbol = normalizeSymbol(snapshot.symbol)
    const bySymbol = alerts.filter((alert) => alert.isActive && alert.symbol === symbol)
    const priceChangePct =
      ((snapshot.currentPrice - snapshot.previousClose) / Math.max(snapshot.previousClose, 0.01)) * 100

    if (Math.abs(priceChangePct) >= prefs.priceChangeThreshold) {
      proactive.push({
        symbol,
        severity: Math.abs(priceChangePct) >= prefs.priceChangeThreshold * 1.8 ? "critical" : "warning",
        headline: locale === "fr" ? "Mouvement de prix inhabituel" : "Unusual price movement",
        recommendation:
          locale === "fr"
            ? `${symbol} varie de ${priceChangePct.toFixed(2)}% sur la derniere periode.`
            : `${symbol} moved ${priceChangePct.toFixed(2)}% over the latest period.`,
      })
    }

    if (snapshot.rsi <= prefs.rsiThreshold || snapshot.rsi >= 100 - prefs.rsiThreshold) {
      proactive.push({
        symbol,
        severity: "warning",
        headline: locale === "fr" ? "Signal RSI detecte" : "RSI signal detected",
        recommendation:
          locale === "fr"
            ? `${symbol} RSI=${snapshot.rsi.toFixed(1)}. Verifier l'opportunite d'entree/sortie.`
            : `${symbol} RSI=${snapshot.rsi.toFixed(1)}. Review entry/exit setup.`,
      })
    }

    for (const alert of bySymbol) {
      const satisfied = evaluateAlertCondition(
        alert,
        snapshot.currentPrice,
        snapshot.rsi,
        snapshot.volume,
        snapshot.previousClose
      )
      if (!satisfied) continue

      if (alert.triggeredAt) {
        const elapsed = now - new Date(alert.triggeredAt).getTime()
        if (elapsed < ALERT_COOLDOWN_MS) continue
      }

      const flagged = triggerAlert(alert.id, snapshot.currentPrice)
      if (flagged && passesSeverityThreshold(flagged.severity, prefs.severityThreshold)) {
        triggered.push(flagged)
      }
    }
  }

  const uniqueProactive = dedupeProactive(proactive).slice(0, 12)
  return { triggered, proactive: uniqueProactive }
}

export function getAlertsSnapshot() {
  const alerts = loadAlerts()
  const active = alerts.filter((alert) => alert.isActive)
  const recentTriggered = getRecentTriggeredAlerts(180).slice(0, 20)

  return {
    activeCount: active.length,
    criticalCount: active.filter((alert) => alert.severity === "critical").length,
    warningCount: active.filter((alert) => alert.severity === "warning").length,
    active: active.slice(0, 20).map((alert) => ({
      id: alert.id,
      symbol: alert.symbol,
      type: alert.type,
      severity: alert.severity,
      condition: alert.condition,
      message: alert.message,
      createdAt: alert.createdAt,
    })),
    recentTriggered: recentTriggered.map((alert) => ({
      id: alert.id,
      symbol: alert.symbol,
      severity: alert.severity,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      currentValue: alert.currentValue,
    })),
  }
}

function dedupeProactive(items: ProactiveSignal[]) {
  const map = new Map<string, ProactiveSignal>()
  for (const item of items) {
    const key = `${item.symbol}-${item.headline}`
    const prev = map.get(key)
    if (!prev || severityRank[item.severity] > severityRank[prev.severity]) {
      map.set(key, item)
    }
  }
  return Array.from(map.values())
}
