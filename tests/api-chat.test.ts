import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
  createOpenAI: vi.fn(),
}))

vi.mock("ai", () => ({
  streamText: mocks.streamText,
  convertToModelMessages: mocks.convertToModelMessages,
}))

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: mocks.createOpenAI,
}))

import { POST } from "@/app/api/chat/route"
import { chatRateLimiter } from "@/lib/chat-rate-limiter"

describe("/api/chat", () => {
  const previousApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = previousApiKey
    chatRateLimiter.clear()
  })

  it("returns 500 when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", parts: [{ type: "text", text: "Bonjour" }] }],
        }),
      })
    )

    expect(response.status).toBe(500)
    expect(mocks.streamText).not.toHaveBeenCalled()
  })

  it("returns 400 when request payload is invalid", async () => {
    process.env.OPENAI_API_KEY = "test-key"

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.streamText).not.toHaveBeenCalled()
  })

  it("returns 400 when aiFinanceIntelligence payload is invalid", async () => {
    process.env.OPENAI_API_KEY = "test-key"

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", parts: [{ type: "text", text: "Bonjour" }] }],
          aiFinanceIntelligence: {
            version: 1,
            generatedAt: "not-a-date",
            scores: { financialHealth: 80, riskControl: 70, executionConsistency: 75 },
            metrics: {
              netWorthUsd: 10000,
              cashUsd: 2000,
              debtUsd: 500,
              monthlyIncomeUsd: 3000,
              monthlyExpenseUsd: 2200,
              monthlyNetUsd: 800,
              savingsRatePct: 26,
              debtToCashRatio: 0.25,
              emergencyFundMonths: 2.5,
              portfolioConcentrationPct: 40,
              activeTradingPositions: 3,
              realizedTradingPnlUsd: 120,
              stockAlertsActive: 2,
              stockAlertsCritical: 1,
              goalsCompletionPct: 55,
            },
            priorities: [],
            opportunities: [],
            constraints: [],
          },
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.streamText).not.toHaveBeenCalled()
  })

  it("streams response when payload is valid", async () => {
    process.env.OPENAI_API_KEY = "test-key"

    const modelFactory = vi.fn(() => "mock-model")
    mocks.createOpenAI.mockReturnValue(modelFactory)
    mocks.convertToModelMessages.mockResolvedValue([])
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok", { status: 200 }),
    })

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
        body: JSON.stringify({
          uiLocale: "fr",
          messages: [{ role: "user", parts: [{ type: "text", text: "Analyse mon portefeuille" }] }],
          portfolioData: {
            accounts: [],
            transactions: [],
            goals: [],
            stockActions: [],
            totalBalance: "$0.00",
          },
          aiFinanceIntelligence: {
            version: 1,
            generatedAt: "2026-02-10T12:00:00.000Z",
            scores: { financialHealth: 74, riskControl: 68, executionConsistency: 72 },
            metrics: {
              netWorthUsd: 11200,
              cashUsd: 2500,
              debtUsd: 1400,
              monthlyIncomeUsd: 4200,
              monthlyExpenseUsd: 3300,
              monthlyNetUsd: 900,
              savingsRatePct: 21.43,
              debtToCashRatio: 0.56,
              emergencyFundMonths: 2.8,
              portfolioConcentrationPct: 38.5,
              activeTradingPositions: 2,
              realizedTradingPnlUsd: 220,
              stockAlertsActive: 3,
              stockAlertsCritical: 1,
              goalsCompletionPct: 47,
            },
            priorities: [
              {
                id: "emergency-fund-gap",
                title: "Build emergency buffer",
                reason: "Liquidity buffer below threshold.",
                severity: "critical",
                metricLabel: "Emergency Fund",
                metricValue: "2.8 months",
                nextAction: "Increase automated monthly savings.",
              },
            ],
            opportunities: ["Route monthly surplus toward debt + investments."],
            constraints: ["Max position 20%, short disabled."],
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.createOpenAI).toHaveBeenCalledWith({ apiKey: "test-key" })
    expect(mocks.streamText).toHaveBeenCalledTimes(1)
    const streamInput = mocks.streamText.mock.calls[0]?.[0]
    expect(streamInput?.system).toContain("AI Finance Intelligence Layer")
    expect(streamInput?.system).toContain("Build emergency buffer")
  })

  it("returns 429 when rate limit is exceeded for a client identifier", async () => {
    process.env.OPENAI_API_KEY = "test-key"

    const modelFactory = vi.fn(() => "mock-model")
    mocks.createOpenAI.mockReturnValue(modelFactory)
    mocks.convertToModelMessages.mockResolvedValue([])
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok", { status: 200 }),
    })

    const payload = {
      messages: [{ role: "user", parts: [{ type: "text", text: "status" }] }],
    }

    for (let i = 0; i < 20; i += 1) {
      const response = await POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "9.8.7.6",
          },
          body: JSON.stringify(payload),
        })
      )

      expect(response.status).toBe(200)
    }

    const blocked = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "9.8.7.6",
        },
        body: JSON.stringify(payload),
      })
    )

    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("Retry-After")).toBeTruthy()
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0")
  })

  it("uses user-agent as fallback identifier when no ip headers are provided", async () => {
    process.env.OPENAI_API_KEY = "test-key"

    const modelFactory = vi.fn(() => "mock-model")
    mocks.createOpenAI.mockReturnValue(modelFactory)
    mocks.convertToModelMessages.mockResolvedValue([])
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok", { status: 200 }),
    })

    const requestForAgent = (agent: string) =>
      POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": agent,
          },
          body: JSON.stringify({
            messages: [{ role: "user", parts: [{ type: "text", text: "status" }] }],
          }),
        })
      )

    for (let i = 0; i < 20; i += 1) {
      const okResponse = await requestForAgent("agent-a")
      expect(okResponse.status).toBe(200)
    }

    const blocked = await requestForAgent("agent-a")
    expect(blocked.status).toBe(429)

    const differentClient = await requestForAgent("agent-b")
    expect(differentClient.status).toBe(200)
  })

  it("ignores unknown x-forwarded-for tokens and uses the first valid ip", async () => {
    process.env.OPENAI_API_KEY = "test-key"

    const modelFactory = vi.fn(() => "mock-model")
    mocks.createOpenAI.mockReturnValue(modelFactory)
    mocks.convertToModelMessages.mockResolvedValue([])
    mocks.streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok", { status: 200 }),
    })

    const payload = {
      messages: [{ role: "user", parts: [{ type: "text", text: "health" }] }],
    }

    for (let i = 0; i < 20; i += 1) {
      const response = await POST(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "unknown, 3.3.3.3, 9.9.9.9",
          },
          body: JSON.stringify(payload),
        })
      )
      expect(response.status).toBe(200)
    }

    const blocked = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "3.3.3.3",
        },
        body: JSON.stringify(payload),
      })
    )

    expect(blocked.status).toBe(429)
  })
})
