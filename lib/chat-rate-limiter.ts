export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

interface RateLimitState {
  count: number
  resetAt: number
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const UNKNOWN_TOKEN = "unknown"
const MAX_IDENTIFIER_LENGTH = 160

function isLikelyIpAddress(input: string) {
  const value = input.trim().replace(/^\[|\]$/g, "")
  if (!value) return false
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return true
  if (value.includes(":")) return true
  return false
}

function extractIpCandidate(raw: string) {
  const cleaned = raw.trim().replace(/^for=/i, "").replace(/^"|"$/g, "")
  if (!cleaned) return null

  const withoutPort = cleaned.match(/^(.+):(\d{2,5})$/)?.[1] ?? cleaned
  const value = withoutPort.trim().replace(/^\[|\]$/g, "")

  if (!value || value.toLowerCase() === UNKNOWN_TOKEN || !isLikelyIpAddress(value)) {
    return null
  }

  return value.slice(0, MAX_IDENTIFIER_LENGTH)
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

export function createClientIdentifier(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    for (const token of forwardedFor.split(",")) {
      const candidate = extractIpCandidate(token)
      if (candidate) return candidate
    }
  }

  const fallbackIpHeaders = ["x-real-ip", "cf-connecting-ip", "x-client-ip"]
  for (const header of fallbackIpHeaders) {
    const value = headers.get(header)
    if (!value) continue
    const candidate = extractIpCandidate(value)
    if (candidate) return candidate
  }

  const userAgent = headers.get("user-agent")?.trim()
  if (userAgent) {
    return `ua:${hashString(userAgent.slice(0, 256))}`
  }

  return UNKNOWN_TOKEN
}

export class InMemoryRateLimiter {
  private readonly store = new Map<string, RateLimitState>()

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number
  ) {}

  private prune(now: number) {
    for (const [key, value] of this.store.entries()) {
      if (value.resetAt <= now) {
        this.store.delete(key)
      }
    }
  }

  enforce(identifier: string, now = Date.now()): RateLimitResult {
    this.prune(now)

    const key = identifier.slice(0, MAX_IDENTIFIER_LENGTH)
    const current = this.store.get(key)

    if (!current) {
      this.store.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      })

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: Math.ceil((now + this.windowMs) / 1000),
        retryAfterSeconds: 0,
      }
    }

    if (current.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil(current.resetAt / 1000),
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      }
    }

    current.count += 1
    this.store.set(key, current)

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - current.count),
      resetAt: Math.ceil(current.resetAt / 1000),
      retryAfterSeconds: 0,
    }
  }

  clear() {
    this.store.clear()
  }
}

const rateLimitWindowMs = parsePositiveInteger(process.env.AI_RATE_LIMIT_WINDOW_MS, 60_000)
export const rateLimitMaxRequests = parsePositiveInteger(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 20)

export const chatRateLimiter = new InMemoryRateLimiter(rateLimitWindowMs, rateLimitMaxRequests)
