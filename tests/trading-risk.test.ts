import { describe, expect, it } from "vitest"
import { buildTradingRiskSnapshot, isRiskIncreasingOrder } from "@/lib/trading-risk"
import type { PaperTradingStore } from "@/lib/trading-types"

const makeStore = (): PaperTradingStore => ({
  version: 1,
  cashCents: 1_000_000,
  realizedPnlCents: 0,
  policy: {
    maxPositionPct: 50,
    maxOrderNotionalCents: 500_000,
    allowShort: false,
    blockedSymbols: [],
    maxOpenPositions: 8,
    maxDailyLossCents: 100_000,
    maxDrawdownPct: 20,
    killSwitchEnabled: false,
  },
  positions: [],
  orders: [],
  equityHistory: [{ at: new Date().toISOString(), equityCents: 1_000_000 }],
  updatedAt: new Date().toISOString(),
})

describe("trading risk", () => {
  it("halts trading when kill-switch is enabled", () => {
    const store = makeStore()
    store.policy.killSwitchEnabled = true

    const snapshot = buildTradingRiskSnapshot(store, {
      cashCents: 1_000_000,
      positionsValueCents: 0,
      equityCents: 1_000_000,
      realizedPnlCents: 0,
      buyingPowerCents: 1_000_000,
    })

    expect(snapshot.level).toBe("halt")
    expect(snapshot.canTrade).toBe(false)
  })

  it("restricts when drawdown is near threshold", () => {
    const store = makeStore()
    store.equityHistory = [
      { at: "2026-02-10T00:00:00.000Z", equityCents: 1_000_000 },
      { at: "2026-02-11T00:00:00.000Z", equityCents: 990_000 },
    ]

    const snapshot = buildTradingRiskSnapshot(store, {
      cashCents: 820_000,
      positionsValueCents: 0,
      equityCents: 830_000,
      realizedPnlCents: -50_000,
      buyingPowerCents: 820_000,
    })

    expect(snapshot.level).toBe("restrict")
    expect(snapshot.drawdownPct).toBeGreaterThan(15)
    expect(snapshot.canOpenNewRisk).toBe(false)
  })

  it("detects risk-increasing and risk-reducing order intent", () => {
    expect(isRiskIncreasingOrder(0, { side: "buy", quantity: 1 })).toBe(true)
    expect(isRiskIncreasingOrder(2, { side: "sell", quantity: 1 })).toBe(false)
    expect(isRiskIncreasingOrder(0, { side: "sell", quantity: 1 })).toBe(true)
    expect(isRiskIncreasingOrder(-2, { side: "buy", quantity: 1 })).toBe(false)
  })
})
