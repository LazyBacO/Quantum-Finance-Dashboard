import type {
  PaperAccountSummary,
  PaperOrder,
  PaperOrderInput,
  PaperTradingRiskSignal,
  PaperTradingRiskSnapshot,
  PaperTradingStore,
} from "@/lib/trading-types"

const HOURS_24_MS = 24 * 60 * 60 * 1000

const round2 = (value: number) => Number(value.toFixed(2))

const getRejectedOrders24h = (orders: PaperOrder[]) => {
  const cutoff = Date.now() - HOURS_24_MS
  return orders.filter((order) => {
    if (order.status !== "rejected") return false
    const timestamp = new Date(order.requestedAt).getTime()
    return Number.isFinite(timestamp) && timestamp >= cutoff
  }).length
}

const getPeakEquityCents = (store: PaperTradingStore, currentEquityCents: number) => {
  const historyPeak = store.equityHistory.reduce((max, point) => {
    return point.equityCents > max ? point.equityCents : max
  }, 0)
  return Math.max(historyPeak, currentEquityCents, 1)
}

const pushSignal = (signals: PaperTradingRiskSignal[], signal: PaperTradingRiskSignal) => {
  if (!signals.some((item) => item.code === signal.code)) {
    signals.push(signal)
  }
}

export function buildTradingRiskSnapshot(
  store: PaperTradingStore,
  account: PaperAccountSummary
): PaperTradingRiskSnapshot {
  const signals: PaperTradingRiskSignal[] = []
  const rejectedOrders24h = getRejectedOrders24h(store.orders)
  const activePositions = store.positions.filter((position) => Math.abs(position.quantity) > 1e-8).length
  const currentEquityCents = account.equityCents
  const peakEquityCents = getPeakEquityCents(store, currentEquityCents)
  const drawdownPct =
    peakEquityCents > 0 ? ((peakEquityCents - currentEquityCents) / peakEquityCents) * 100 : 0
  const cashRatioPct =
    currentEquityCents > 0 ? (Math.max(0, account.cashCents) / currentEquityCents) * 100 : 0

  if (store.policy.killSwitchEnabled) {
    pushSignal(signals, {
      code: "kill-switch",
      severity: "critical",
      message: "Manual kill-switch is enabled. Trading is halted.",
    })
  }

  if (store.policy.maxDailyLossCents > 0 && store.realizedPnlCents <= -store.policy.maxDailyLossCents) {
    pushSignal(signals, {
      code: "daily-loss-limit",
      severity: "critical",
      message: "Daily realized loss limit breached. Stop adding risk.",
    })
  }

  if (drawdownPct >= store.policy.maxDrawdownPct) {
    pushSignal(signals, {
      code: "max-drawdown-limit",
      severity: "critical",
      message: `Portfolio drawdown ${round2(drawdownPct)}% exceeds limit ${round2(store.policy.maxDrawdownPct)}%.`,
    })
  } else if (drawdownPct >= store.policy.maxDrawdownPct * 0.8) {
    pushSignal(signals, {
      code: "drawdown-watch",
      severity: "warning",
      message: `Portfolio drawdown ${round2(drawdownPct)}% is near the max threshold.`,
    })
  }

  if (activePositions > store.policy.maxOpenPositions) {
    pushSignal(signals, {
      code: "open-positions-over-limit",
      severity: "critical",
      message: `Open positions ${activePositions} exceed configured cap ${store.policy.maxOpenPositions}.`,
    })
  } else if (activePositions >= Math.max(1, Math.floor(store.policy.maxOpenPositions * 0.85))) {
    pushSignal(signals, {
      code: "open-positions-near-limit",
      severity: "warning",
      message: `Open positions ${activePositions} are close to cap ${store.policy.maxOpenPositions}.`,
    })
  }

  if (rejectedOrders24h >= 8) {
    pushSignal(signals, {
      code: "rejected-order-spike",
      severity: "critical",
      message: `${rejectedOrders24h} rejected orders in 24h. Review execution policy.`,
    })
  } else if (rejectedOrders24h >= 4) {
    pushSignal(signals, {
      code: "rejected-order-watch",
      severity: "warning",
      message: `${rejectedOrders24h} rejected orders in 24h indicate unstable execution behavior.`,
    })
  }

  if (cashRatioPct < 5) {
    pushSignal(signals, {
      code: "low-cash-buffer",
      severity: "warning",
      message: `Cash buffer is low (${round2(cashRatioPct)}% of equity).`,
    })
  }

  const hasCritical = signals.some((signal) => signal.severity === "critical")
  const hasWarning = signals.some((signal) => signal.severity === "warning")
  const level: PaperTradingRiskSnapshot["level"] = hasCritical
    ? "halt"
    : hasWarning
      ? "restrict"
      : signals.length > 0
        ? "watch"
        : "ok"

  return {
    level,
    canTrade: level !== "halt",
    canOpenNewRisk: level === "ok" || level === "watch",
    killSwitch: store.policy.killSwitchEnabled,
    peakEquityCents,
    currentEquityCents,
    drawdownPct: round2(Math.max(0, drawdownPct)),
    rejectedOrders24h,
    signals: signals.slice(0, 20),
  }
}

export function isRiskIncreasingOrder(currentQty: number, input: Pick<PaperOrderInput, "side" | "quantity">) {
  if (input.side === "buy") {
    return currentQty >= 0 || input.quantity > Math.abs(currentQty)
  }
  return currentQty <= 0 || input.quantity > currentQty
}
