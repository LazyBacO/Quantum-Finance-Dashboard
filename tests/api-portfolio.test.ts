import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUserPortfolioState: vi.fn(),
  setUserPortfolioState: vi.fn(),
}))

vi.mock("@/lib/portfolio-sync-storage", () => ({
  getUserPortfolioState: mocks.getUserPortfolioState,
  setUserPortfolioState: mocks.setUserPortfolioState,
}))

import { GET, PUT } from "@/app/api/portfolio/route"

const sampleState = {
  version: 2 as const,
  accounts: [
    {
      id: "acc-1",
      title: "Main",
      description: "Primary",
      balanceCents: 123_00,
      type: "checking" as const,
    },
  ],
  transactions: [],
  goals: [],
  stockActions: [],
  lastSaved: "2026-02-09T10:00:00.000Z",
}

describe("/api/portfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects requests without sync key", async () => {
    const response = await GET(new Request("http://localhost/api/portfolio"))
    expect(response.status).toBe(401)
  })

  it("validates payload on PUT", async () => {
    const response = await PUT(
      new Request("http://localhost/api/portfolio", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-sync-key": "1234567890abcdef",
        },
        body: JSON.stringify({ state: { invalid: true } }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.setUserPortfolioState).not.toHaveBeenCalled()
  })

  it("stores then returns user portfolio state", async () => {
    mocks.getUserPortfolioState.mockResolvedValueOnce(sampleState)
    mocks.setUserPortfolioState.mockResolvedValueOnce(sampleState)

    const putResponse = await PUT(
      new Request("http://localhost/api/portfolio", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-sync-key": "1234567890abcdef",
        },
        body: JSON.stringify({ state: sampleState }),
      })
    )

    expect(putResponse.status).toBe(200)
    expect(mocks.setUserPortfolioState).toHaveBeenCalledWith("1234567890abcdef", sampleState)

    const getResponse = await GET(
      new Request("http://localhost/api/portfolio", {
        headers: {
          "x-sync-key": "1234567890abcdef",
        },
      })
    )

    expect(getResponse.status).toBe(200)
    const payload = (await getResponse.json()) as { hasState: boolean }
    expect(payload.hasState).toBe(true)
  })
})
