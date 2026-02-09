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

describe("/api/chat", () => {
  const previousApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = previousApiKey
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
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.createOpenAI).toHaveBeenCalledWith({ apiKey: "test-key" })
    expect(mocks.streamText).toHaveBeenCalledTimes(1)
  })
})
