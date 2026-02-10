import { promises as fs } from "fs"
import path from "path"
import { buildTradingRiskSnapshot } from "@/lib/trading-risk"
import {
  buildAccountSummary,
  computePositionWithMarket,
  executePaperOrder,
  getPaperQuote,
  getPaperQuotes,
  normalizeSymbol,
} from "@/lib/trading-engine"
import {
  paperOrderInputSchema,
  paperTradingPolicySchema,
  paperTradingPolicyUpdateSchema,
  paperTradingStoreSchema,
  type OrderSource,
  type PaperOrderInput,
  type PaperTradingOverview,
  type PaperTradingPolicy,
  type PaperTradingPolicyUpdate,
  type PaperTradingStore,
} from "@/lib/trading-types"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "trading-paper.json")
const AUDIT_PATH = path.join(DATA_DIR, "trading-audit.ndjson")

const defaultPolicy: PaperTradingPolicy = {
  maxPositionPct: 35,
  maxOrderNotionalCents: 2_500_000,
  allowShort: false,
  blockedSymbols: [],
  maxOpenPositions: 12,
  maxDailyLossCents: 250_000,
  maxDrawdownPct: 18,
  killSwitchEnabled: false,
}

const seedStore: PaperTradingStore = {
  version: 1,
  cashCents: 10_000_000,
  realizedPnlCents: 0,
  policy: defaultPolicy,
  positions: [],
  orders: [],
  equityHistory: [
    {
      at: new Date().toISOString(),
      equityCents: 10_000_000,
    },
  ],
  updatedAt: new Date().toISOString(),
}

const ensureStoreFile = async () => {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(seedStore, null, 2), "utf-8")
  }
}

const normalizeStore = (input: unknown): PaperTradingStore => {
  const parsed = paperTradingStoreSchema.safeParse(input)
  if (parsed.success) {
    return parsed.data
  }

  const raw = input as Partial<PaperTradingStore> | undefined
  const rawPolicy =
    raw?.policy && typeof raw.policy === "object"
      ? (raw.policy as Partial<PaperTradingPolicy>)
      : {}
  const policy = paperTradingPolicySchema.safeParse({
    ...defaultPolicy,
    ...rawPolicy,
  })

  return {
    version: 1,
    cashCents: typeof raw?.cashCents === "number" && Number.isFinite(raw.cashCents) ? Math.round(raw.cashCents) : seedStore.cashCents,
    realizedPnlCents:
      typeof raw?.realizedPnlCents === "number" && Number.isFinite(raw.realizedPnlCents)
        ? Math.round(raw.realizedPnlCents)
        : seedStore.realizedPnlCents,
    policy: policy.success ? policy.data : defaultPolicy,
    positions: Array.isArray(raw?.positions)
      ? raw.positions
          .filter((position): position is PaperTradingStore["positions"][number] =>
            typeof position?.symbol === "string"
          )
          .map((position) => ({
            symbol: normalizeSymbol(position.symbol),
            quantity: Number.isFinite(position.quantity) ? position.quantity : 0,
            avgPriceCents: Number.isFinite(position.avgPriceCents) ? Math.max(1, Math.round(position.avgPriceCents)) : 1,
          }))
          .filter((position) => Math.abs(position.quantity) > 1e-8)
      : [],
    orders: Array.isArray(raw?.orders)
      ? raw.orders
          .map((order) => {
            const orderParsed = paperTradingStoreSchema.shape.orders.element.safeParse(order)
            return orderParsed.success ? orderParsed.data : null
          })
          .filter((order): order is PaperTradingStore["orders"][number] => Boolean(order))
      : [],
    equityHistory: Array.isArray(raw?.equityHistory)
      ? raw.equityHistory
          .map((point) => {
            const parsedPoint = paperTradingStoreSchema.shape.equityHistory.element.safeParse(point)
            return parsedPoint.success ? parsedPoint.data : null
          })
          .filter((point): point is PaperTradingStore["equityHistory"][number] => Boolean(point))
      : [],
    updatedAt: new Date().toISOString(),
  }
}

const appendEquityPoint = (store: PaperTradingStore) => {
  const account = buildAccountSummary(store.cashCents, store.realizedPnlCents, store.positions)
  const latest = store.equityHistory[0]
  const now = new Date()

  // Keep one point per minute to avoid unbounded noise while preserving trend.
  const canReuse =
    latest &&
    Math.abs(new Date(latest.at).getTime() - now.getTime()) < 60_000 &&
    latest.equityCents === account.equityCents

  if (canReuse) {
    return store
  }

  return {
    ...store,
    equityHistory: [{ at: now.toISOString(), equityCents: account.equityCents }, ...store.equityHistory].slice(0, 5000),
  }
}

const appendAuditEvent = async (event: Record<string, unknown>) => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.appendFile(AUDIT_PATH, `${JSON.stringify(event)}\n`, "utf-8")
}

export const readTradingStore = async (): Promise<PaperTradingStore> => {
  await ensureStoreFile()
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const store = normalizeStore(JSON.parse(raw))
    if (store.equityHistory.length > 0) {
      return store
    }
    return appendEquityPoint(store)
  } catch {
    return seedStore
  }
}

export const writeTradingStore = async (store: PaperTradingStore) => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const normalized = normalizeStore(store)
  await fs.writeFile(DATA_PATH, JSON.stringify(normalized, null, 2), "utf-8")
}

export const getTradingOverview = async (): Promise<PaperTradingOverview> => {
  const store = await readTradingStore()
  const positions = store.positions
    .map((position) => computePositionWithMarket(position))
    .sort((a, b) => Math.abs(b.marketValueCents) - Math.abs(a.marketValueCents))
  const account = buildAccountSummary(store.cashCents, store.realizedPnlCents, store.positions)
  const risk = buildTradingRiskSnapshot(store, account)

  return {
    account,
    policy: store.policy,
    positions,
    recentOrders: store.orders.slice(0, 50),
    risk,
  }
}

export const listTradingOrders = async () => {
  const store = await readTradingStore()
  return store.orders
}

export const placeTradingOrder = async (
  input: PaperOrderInput,
  options?: { idempotencyKey?: string; source?: OrderSource }
) => {
  const parsed = paperOrderInputSchema.parse(input)
  const store = await readTradingStore()
  const idempotencyKey = options?.idempotencyKey?.trim()

  if (idempotencyKey) {
    const duplicate = store.orders.find((order) => order.idempotencyKey === idempotencyKey)
    if (duplicate) {
      await appendAuditEvent({
        ts: new Date().toISOString(),
        type: "order-idempotent-replay",
        idempotencyKey,
        orderId: duplicate.id,
        status: duplicate.status,
      })
      return duplicate
    }
  }

  const source = options?.source ?? "api"
  const result = executePaperOrder(store, parsed, { idempotencyKey, source })
  const nextStore = appendEquityPoint(result.store)
  await writeTradingStore(nextStore)

  const account = buildAccountSummary(nextStore.cashCents, nextStore.realizedPnlCents, nextStore.positions)
  const risk = buildTradingRiskSnapshot(nextStore, account)
  await appendAuditEvent({
    ts: new Date().toISOString(),
    type: "order-executed",
    orderId: result.order.id,
    idempotencyKey: idempotencyKey ?? null,
    source,
    status: result.order.status,
    symbol: result.order.symbol,
    side: result.order.side,
    quantity: result.order.quantity,
    notionalCents: result.order.notionalCents,
    reason: result.order.reason ?? null,
    riskLevel: risk.level,
  })

  return result.order
}

export const getTradingPolicy = async (): Promise<PaperTradingPolicy> => {
  const store = await readTradingStore()
  return store.policy
}

export const updateTradingPolicy = async (updates: PaperTradingPolicyUpdate): Promise<PaperTradingPolicy> => {
  const parsedUpdates = paperTradingPolicyUpdateSchema.parse(updates)
  const store = await readTradingStore()

  const merged = paperTradingPolicySchema.parse({
    ...store.policy,
    ...parsedUpdates,
    blockedSymbols:
      parsedUpdates.blockedSymbols?.map((symbol) => normalizeSymbol(symbol)) ??
      store.policy.blockedSymbols.map((symbol) => normalizeSymbol(symbol)),
  })

  store.policy = merged
  const nextStore = appendEquityPoint({
    ...store,
    updatedAt: new Date().toISOString(),
  })
  await writeTradingStore(nextStore)
  await appendAuditEvent({
    ts: new Date().toISOString(),
    type: "policy-updated",
    payload: parsedUpdates,
  })
  return nextStore.policy
}

export const getTradingQuotes = async (symbols: string[]) => {
  const cleanSymbols = symbols.map((symbol) => normalizeSymbol(symbol)).filter((symbol) => symbol.length > 0)
  if (cleanSymbols.length === 0) {
    return []
  }

  const quotes = cleanSymbols.length === 1 ? [getPaperQuote(cleanSymbols[0])] : getPaperQuotes(cleanSymbols)
  return quotes
}
