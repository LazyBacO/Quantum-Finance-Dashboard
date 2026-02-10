import { randomUUID } from "crypto"
import type { MarketDataRequestConfig } from "@/lib/market-data-config"
import { getCachedPreferredMarketQuote } from "@/lib/market-data-router"
import { buildTradingRiskSnapshot, isRiskIncreasingOrder } from "@/lib/trading-risk"
import {
  paperOrderSchema,
  type OrderSource,
  type PaperAccountSummary,
  type PaperOrder,
  type PaperOrderInput,
  type PaperPosition,
  type PaperPositionWithMarket,
  type PaperQuote,
  type PaperTradingStore,
} from "@/lib/trading-types"

const BASE_QUOTES_CENTS: Record<string, number> = {
  AAPL: 19150,
  MSFT: 42820,
  NVDA: 13870,
  TSLA: 24640,
  AMZN: 18310,
  GOOGL: 17690,
  META: 51230,
  SPY: 59780,
  QQQ: 52840,
  BTCUSD: 10425000,
  ETHUSD: 342500,
}

const nowIso = () => new Date().toISOString()

const hashSymbol = (symbol: string) => {
  let hash = 0
  for (const char of symbol) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

export const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase()

export const getPaperQuote = (
  symbolInput: string,
  marketDataConfig?: MarketDataRequestConfig
): PaperQuote => {
  const symbol = normalizeSymbol(symbolInput)
  const cachedQuote = getCachedPreferredMarketQuote(symbol, marketDataConfig)
  const base = cachedQuote ?? BASE_QUOTES_CENTS[symbol] ?? (500 + (hashSymbol(symbol) % 200000))
  const now = new Date()
  const minuteBucket = Math.floor(now.getTime() / 60_000)
  const microDrift = ((hashSymbol(`${symbol}-${minuteBucket}`) % 300) - 150) / 10_000
  const priceCents =
    cachedQuote !== null
      ? Math.max(1, Math.round(base))
      : Math.max(1, Math.round(base * (1 + microDrift)))

  return {
    symbol,
    priceCents,
    asOf: now.toISOString(),
  }
}

export const getPaperQuotes = (
  symbols: string[],
  marketDataConfig?: MarketDataRequestConfig
): PaperQuote[] => {
  const unique = Array.from(new Set(symbols.map(normalizeSymbol).filter((symbol) => symbol.length > 0)))
  return unique.map((symbol) => getPaperQuote(symbol, marketDataConfig))
}

export const computePositionWithMarket = (
  position: PaperPosition,
  marketDataConfig?: MarketDataRequestConfig
): PaperPositionWithMarket => {
  const quote = getPaperQuote(position.symbol, marketDataConfig)
  const marketValueCents = Math.round(position.quantity * quote.priceCents)
  const bookCostCents = Math.round(position.quantity * position.avgPriceCents)

  return {
    ...position,
    marketPriceCents: quote.priceCents,
    marketValueCents,
    unrealizedPnlCents: marketValueCents - bookCostCents,
  }
}

export const buildAccountSummary = (
  cashCents: number,
  realizedPnlCents: number,
  positions: PaperPosition[],
  marketDataConfig?: MarketDataRequestConfig
): PaperAccountSummary => {
  const enriched = positions.map((position) => computePositionWithMarket(position, marketDataConfig))
  const positionsValueCents = enriched.reduce((sum, position) => sum + position.marketValueCents, 0)
  const equityCents = cashCents + positionsValueCents

  return {
    cashCents,
    positionsValueCents,
    equityCents,
    realizedPnlCents,
    buyingPowerCents: Math.max(0, cashCents),
  }
}

const findPosition = (positions: PaperPosition[], symbol: string) =>
  positions.find((position) => normalizeSymbol(position.symbol) === normalizeSymbol(symbol))

const upsertPosition = (positions: PaperPosition[], nextPosition: PaperPosition | null) => {
  const symbol = nextPosition ? normalizeSymbol(nextPosition.symbol) : ""
  const next: PaperPosition[] = []

  for (const position of positions) {
    if (normalizeSymbol(position.symbol) === symbol) {
      if (nextPosition && Math.abs(nextPosition.quantity) > 1e-8) {
        next.push(nextPosition)
      }
      continue
    }

    if (Math.abs(position.quantity) > 1e-8) {
      next.push(position)
    }
  }

  if (nextPosition && Math.abs(nextPosition.quantity) > 1e-8 && !next.some((position) => normalizeSymbol(position.symbol) === symbol)) {
    next.push(nextPosition)
  }

  return next
}

const computeNotionalCents = (quantity: number, priceCents: number) => Math.max(0, Math.round(quantity * priceCents))

const toPriorityReason = (message: string) => message.slice(0, 380)

const validateOrder = (
  store: PaperTradingStore,
  input: PaperOrderInput,
  executionPriceCents: number,
  account: PaperAccountSummary,
  marketDataConfig?: MarketDataRequestConfig
): string | null => {
  const symbol = normalizeSymbol(input.symbol)
  const riskSnapshot = buildTradingRiskSnapshot(store, account)

  if (!riskSnapshot.canTrade) {
    const firstCritical = riskSnapshot.signals.find((signal) => signal.severity === "critical")
    return `Ordre rejeté: trading suspendu (${firstCritical?.message ?? "guardrail critique actif"}).`
  }

  if (store.policy.blockedSymbols.map(normalizeSymbol).includes(symbol)) {
    return "Symbole bloqué par la politique de risque."
  }

  if (input.quantity <= 0) {
    return "La quantité doit être supérieure à 0."
  }

  const notionalCents = computeNotionalCents(input.quantity, executionPriceCents)
  if (notionalCents > store.policy.maxOrderNotionalCents) {
    return "Ordre rejeté: dépasse le nominal maximal autorisé."
  }

  const currentPosition = findPosition(store.positions, symbol)
  const currentQty = currentPosition?.quantity ?? 0
  const riskIncreasing = isRiskIncreasingOrder(currentQty, input)
  if (riskIncreasing && !riskSnapshot.canOpenNewRisk) {
    return "Ordre rejeté: le régime de risque actuel interdit d'ouvrir davantage de risque."
  }

  const activePositions = store.positions.filter((position) => Math.abs(position.quantity) > 1e-8).length
  const resultingQty = input.side === "buy" ? currentQty + input.quantity : currentQty - input.quantity
  const opensNewPosition = Math.abs(currentQty) <= 1e-8 && Math.abs(resultingQty) > 1e-8
  if (opensNewPosition && activePositions + 1 > store.policy.maxOpenPositions) {
    return "Ordre rejeté: nombre maximal de positions ouvertes atteint."
  }

  if (input.side === "buy" && notionalCents > store.cashCents) {
    return "Ordre rejeté: trésorerie insuffisante."
  }

  if (input.side === "sell" && !store.policy.allowShort && input.quantity > currentQty + 1e-8) {
    return "Ordre rejeté: vente supérieure à la position disponible."
  }

  const quoteForRisk = getPaperQuote(symbol, marketDataConfig)
  const resultingNotional = Math.abs(resultingQty) * quoteForRisk.priceCents
  const positionPct = account.equityCents > 0 ? (resultingNotional / account.equityCents) * 100 : 100

  if (positionPct > store.policy.maxPositionPct + 1e-8) {
    return "Ordre rejeté: dépasse la taille maximale de position autorisée."
  }

  return null
}

const evaluateExecutionPrice = (input: PaperOrderInput, marketPriceCents: number) => {
  if (input.type === "market") {
    return { executable: true, executionPriceCents: marketPriceCents, reason: null as string | null }
  }

  if (!input.limitPriceCents) {
    return { executable: false, executionPriceCents: marketPriceCents, reason: "Prix limite manquant." }
  }

  if (input.side === "buy" && input.limitPriceCents < marketPriceCents) {
    return {
      executable: false,
      executionPriceCents: marketPriceCents,
      reason: "Limit d'achat sous le prix marché.",
    }
  }

  if (input.side === "sell" && input.limitPriceCents > marketPriceCents) {
    return {
      executable: false,
      executionPriceCents: marketPriceCents,
      reason: "Limit de vente au-dessus du prix marché.",
    }
  }

  return { executable: true, executionPriceCents: input.limitPriceCents, reason: null as string | null }
}

const applyFill = (store: PaperTradingStore, input: PaperOrderInput, executionPriceCents: number) => {
  const symbol = normalizeSymbol(input.symbol)
  const quantity = input.quantity
  const notionalCents = computeNotionalCents(quantity, executionPriceCents)
  const current = findPosition(store.positions, symbol)

  let nextCash = store.cashCents
  let nextRealized = store.realizedPnlCents
  let nextPosition: PaperPosition | null = current
    ? { ...current, symbol }
    : {
        symbol,
        quantity: 0,
        avgPriceCents: executionPriceCents,
      }

  if (input.side === "buy") {
    nextCash -= notionalCents
    if ((nextPosition?.quantity ?? 0) >= 0) {
      const prevQty = nextPosition?.quantity ?? 0
      const prevCost = prevQty * (nextPosition?.avgPriceCents ?? executionPriceCents)
      const nextQty = prevQty + quantity
      const nextAvg = nextQty <= 0 ? executionPriceCents : Math.round((prevCost + quantity * executionPriceCents) / nextQty)
      nextPosition = {
        symbol,
        quantity: nextQty,
        avgPriceCents: nextAvg,
      }
    } else {
      const shortQty = Math.abs(nextPosition?.quantity ?? 0)
      const coverQty = Math.min(shortQty, quantity)
      const remainingQty = quantity - coverQty
      if (nextPosition) {
        nextRealized += Math.round(coverQty * (nextPosition.avgPriceCents - executionPriceCents))
      }

      if (remainingQty > 0) {
        nextPosition = {
          symbol,
          quantity: remainingQty,
          avgPriceCents: executionPriceCents,
        }
      } else {
        const resultingShort = (nextPosition?.quantity ?? 0) + quantity
        nextPosition =
          Math.abs(resultingShort) > 1e-8
            ? {
                symbol,
                quantity: resultingShort,
                avgPriceCents: nextPosition?.avgPriceCents ?? executionPriceCents,
              }
            : null
      }
    }
  } else {
    nextCash += notionalCents
    const prevQty = nextPosition?.quantity ?? 0

    if (prevQty > 0 && nextPosition) {
      const soldQty = Math.min(quantity, prevQty)
      nextRealized += Math.round(soldQty * (executionPriceCents - nextPosition.avgPriceCents))
    }

    const nextQty = prevQty - quantity
    if (Math.abs(nextQty) <= 1e-8) {
      nextPosition = null
    } else if (nextQty < 0) {
      nextPosition = {
        symbol,
        quantity: nextQty,
        avgPriceCents: executionPriceCents,
      }
    } else {
      nextPosition = {
        symbol,
        quantity: nextQty,
        avgPriceCents: nextPosition?.avgPriceCents ?? executionPriceCents,
      }
    }
  }

  return {
    ...store,
    cashCents: nextCash,
    realizedPnlCents: nextRealized,
    positions: upsertPosition(store.positions, nextPosition),
  }
}

export const executePaperOrder = (
  store: PaperTradingStore,
  rawInput: PaperOrderInput,
  options?: { idempotencyKey?: string; source?: OrderSource; marketDataConfig?: MarketDataRequestConfig }
): { store: PaperTradingStore; order: PaperOrder } => {
  const input: PaperOrderInput = {
    ...rawInput,
    symbol: normalizeSymbol(rawInput.symbol),
  }

  const quote = getPaperQuote(input.symbol, options?.marketDataConfig)
  const execution = evaluateExecutionPrice(input, quote.priceCents)
  const account = buildAccountSummary(
    store.cashCents,
    store.realizedPnlCents,
    store.positions,
    options?.marketDataConfig
  )

  const rejection =
    execution.executable
      ? validateOrder(store, input, execution.executionPriceCents, account, options?.marketDataConfig)
      : execution.reason

  if (rejection) {
    const rejectedOrder = paperOrderSchema.parse({
      ...input,
      id: `ord-${randomUUID()}`,
      status: "rejected",
      requestedAt: nowIso(),
      executedAt: null,
      fillPriceCents: null,
      notionalCents: computeNotionalCents(input.quantity, execution.executionPriceCents),
      reason: toPriorityReason(rejection),
      idempotencyKey: options?.idempotencyKey,
      source: options?.source,
    })

    return {
      store: {
        ...store,
        orders: [rejectedOrder, ...store.orders].slice(0, 5000),
        updatedAt: nowIso(),
      },
      order: rejectedOrder,
    }
  }

  const nextStore = applyFill(store, input, execution.executionPriceCents)
  const filledOrder = paperOrderSchema.parse({
    ...input,
    id: `ord-${randomUUID()}`,
    status: "filled",
    requestedAt: nowIso(),
    executedAt: nowIso(),
    fillPriceCents: execution.executionPriceCents,
    notionalCents: computeNotionalCents(input.quantity, execution.executionPriceCents),
    idempotencyKey: options?.idempotencyKey,
    source: options?.source,
  })

  return {
    store: {
      ...nextStore,
      orders: [filledOrder, ...nextStore.orders].slice(0, 5000),
      updatedAt: nowIso(),
    },
    order: filledOrder,
  }
}
