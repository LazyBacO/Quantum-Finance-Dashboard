import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  delete process.env.AI_RATE_LIMIT_MAX_REQUESTS
  delete process.env.AI_RATE_LIMIT_WINDOW_MS
  delete process.env.AI_RATE_LIMIT_MAX_KEYS
  vi.resetModules()
})

describe("chat-rate-limiter config parsing", () => {
  it("rejects partially numeric max request env values", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "30ms"

    const rateLimiterModule = await import("@/lib/chat-rate-limiter")

    expect(rateLimiterModule.chatRateLimitConfig.maxRequests).toBe(20)
  })

  it("accepts clean integer env values", async () => {
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = "30"

    const rateLimiterModule = await import("@/lib/chat-rate-limiter")

    expect(rateLimiterModule.chatRateLimitConfig.maxRequests).toBe(30)
  })
})
