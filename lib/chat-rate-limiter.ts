import { isIP } from "node:net"

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

const UNKNOWN_TOKEN = "unknown"
const MAX_IDENTIFIER_LENGTH = 160
const MAX_FORWARDED_ENTRIES = 20
const MIN_WINDOW_MS = 1_000
const MAX_WINDOW_MS = 3_600_000
const MIN_MAX_REQUESTS = 1
const MAX_MAX_REQUESTS = 500
const MIN_MAX_KEYS = 100
const MAX_MAX_KEYS = 200_000

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false
  return fallback
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  options: { min: number; max: number }
) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < options.min || parsed > options.max) return fallback
  return parsed
}

function isValidIpAddress(value: string) {
  return isIP(value) !== 0
}

function stripForPrefix(raw: string) {
  const trimmed = raw.trim().replace(/^for=/i, "")
  return trimmed.replace(/^"|"$/g, "").trim()
}

function normalizeIpToken(raw: string) {
  const value = stripForPrefix(raw)
  if (!value || value.toLowerCase() === UNKNOWN_TOKEN) return null

  const bracketed = value.match(/^\[([^\]]+)\](?::\d{1,5})?$/)
  if (bracketed?.[1]) {
    return isValidIpAddress(bracketed[1]) ? bracketed[1] : null
  }

  const ipv4WithPort = value.match(/^((?:\d{1,3}\.){3}\d{1,3}):\d{1,5}$/)
  if (ipv4WithPort?.[1]) {
    return isValidIpAddress(ipv4WithPort[1]) ? ipv4WithPort[1] : null
  }

  if (isValidIpAddress(value)) return value

  return null
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function identifierFromForwardedHeader(value: string | null) {
  if (!value) return null

  for (const part of value.split(",").slice(0, MAX_FORWARDED_ENTRIES)) {
    for (const directive of part.split(";")) {
      const directiveTrimmed = directive.trim()
      if (!directiveTrimmed.toLowerCase().startsWith("for=")) continue
      const candidate = normalizeIpToken(directiveTrimmed)
      if (candidate) return candidate
    }
  }

  return null
}

function identifierFromXForwardedFor(value: string | null) {
  if (!value) return null

  for (const token of value.split(",").slice(0, MAX_FORWARDED_ENTRIES)) {
    const candidate = normalizeIpToken(token)
    if (candidate) return candidate
  }

  return null
}

interface ClientIdentifierOptions {
  trustProxyHeaders: boolean
  userAgentSalt: string
}

export function createClientIdentifier(
  headers: Headers,
  options: ClientIdentifierOptions = {
    trustProxyHeaders: chatRateLimitConfig.trustProxyHeaders,
    userAgentSalt: chatRateLimitConfig.userAgentSalt,
  }
) {
  if (options.trustProxyHeaders) {
    const fromForwarded = identifierFromForwardedHeader(headers.get("forwarded"))
    if (fromForwarded) return fromForwarded.slice(0, MAX_IDENTIFIER_LENGTH)

    const fromXForwardedFor = identifierFromXForwardedFor(headers.get("x-forwarded-for"))
    if (fromXForwardedFor) return fromXForwardedFor.slice(0, MAX_IDENTIFIER_LENGTH)
  }

  const fallbackIpHeaders = ["x-real-ip", "cf-connecting-ip", "x-client-ip"]
  for (const header of fallbackIpHeaders) {
    const value = headers.get(header)
    if (!value) continue
    const candidate = normalizeIpToken(value)
    if (candidate) return candidate.slice(0, MAX_IDENTIFIER_LENGTH)
  }

  const userAgent = headers.get("user-agent")?.trim()
  if (userAgent) {
    const saltedUserAgent = `${options.userAgentSalt}:${userAgent.slice(0, 256)}`
    return `ua:${hashString(saltedUserAgent)}`
  }

  return UNKNOWN_TOKEN
}

export class InMemoryRateLimiter {
  private readonly store = new Map<string, RateLimitState>()

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number,
    private readonly maxKeys = 10_000
  ) {
    if (!Number.isFinite(windowMs) || windowMs < MIN_WINDOW_MS || windowMs > MAX_WINDOW_MS) {
      throw new Error("InMemoryRateLimiter windowMs is out of allowed bounds")
    }

    if (
      !Number.isFinite(maxRequests) ||
      maxRequests < MIN_MAX_REQUESTS ||
      maxRequests > MAX_MAX_REQUESTS
    ) {
      throw new Error("InMemoryRateLimiter maxRequests is out of allowed bounds")
    }

    if (!Number.isFinite(maxKeys) || maxKeys < MIN_MAX_KEYS || maxKeys > MAX_MAX_KEYS) {
      throw new Error("InMemoryRateLimiter maxKeys is out of allowed bounds")
    }
  }

  private evictOldestEntries(count: number) {
    if (count <= 0) return

    const oldest = [...this.store.entries()]
      .sort((entryA, entryB) => entryA[1].resetAt - entryB[1].resetAt)
      .slice(0, count)

    for (const [key] of oldest) {
      this.store.delete(key)
    }
  }

  private prune(now: number) {
    for (const [key, value] of this.store.entries()) {
      if (value.resetAt <= now) {
        this.store.delete(key)
      }
    }
  }

  enforce(identifier: string, now = Date.now()): RateLimitResult {
    this.prune(now)

    const normalized = identifier.trim() || UNKNOWN_TOKEN
    const key = normalized.slice(0, MAX_IDENTIFIER_LENGTH)
    const current = this.store.get(key)

    if (!current) {
      if (this.store.size >= this.maxKeys) {
        this.evictOldestEntries(this.store.size - this.maxKeys + 1)
      }

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
        retryAfterSeconds: Math.min(
          Math.ceil(this.windowMs / 1000),
          Math.max(1, Math.ceil((current.resetAt - now) / 1000))
        ),
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

  clearExpired(now = Date.now()) {
    this.prune(now)
  }

  size() {
    return this.store.size
  }
}

export const chatRateLimitConfig = {
  windowMs: parseBoundedInteger(process.env.AI_RATE_LIMIT_WINDOW_MS, 60_000, {
    min: MIN_WINDOW_MS,
    max: MAX_WINDOW_MS,
  }),
  maxRequests: parseBoundedInteger(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 20, {
    min: MIN_MAX_REQUESTS,
    max: MAX_MAX_REQUESTS,
  }),
  maxKeys: parseBoundedInteger(process.env.AI_RATE_LIMIT_MAX_KEYS, 10_000, {
    min: MIN_MAX_KEYS,
    max: MAX_MAX_KEYS,
  }),
  trustProxyHeaders: parseBoolean(process.env.AI_RATE_LIMIT_TRUST_PROXY_HEADERS, true),
  userAgentSalt: process.env.AI_RATE_LIMIT_USER_AGENT_SALT?.trim() || "open-nova-default-salt",
} as const

export const rateLimitMaxRequests = chatRateLimitConfig.maxRequests

export const chatRateLimiter = new InMemoryRateLimiter(
  chatRateLimitConfig.windowMs,
  chatRateLimitConfig.maxRequests,
  chatRateLimitConfig.maxKeys
)
