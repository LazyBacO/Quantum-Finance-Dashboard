import { afterEach, describe, expect, it } from "vitest"

import { GET } from "@/app/api/health/convex/route"

const originalConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const originalDeployKey = process.env.CONVEX_DEPLOY_KEY

describe("/api/health/convex", () => {
  afterEach(() => {
    if (originalConvexUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CONVEX_URL
    } else {
      process.env.NEXT_PUBLIC_CONVEX_URL = originalConvexUrl
    }

    if (originalDeployKey === undefined) {
      delete process.env.CONVEX_DEPLOY_KEY
    } else {
      process.env.CONVEX_DEPLOY_KEY = originalDeployKey
    }
  })

  it("returns 503 when Convex URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL
    delete process.env.CONVEX_DEPLOY_KEY

    const response = await GET()
    expect(response.status).toBe(503)

    const payload = (await response.json()) as {
      ok: boolean
      provider: string
      configured: boolean
      reason: string
    }

    expect(payload).toMatchObject({
      ok: false,
      provider: "convex",
      configured: false,
      reason: "Missing NEXT_PUBLIC_CONVEX_URL",
    })
  })

  it("returns 200 when Convex URL exists", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://demo.convex.cloud"
    process.env.CONVEX_DEPLOY_KEY = "demo-key"

    const response = await GET()
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      ok: boolean
      provider: string
      configured: boolean
      hasDeployKey: boolean
    }

    expect(payload).toMatchObject({
      ok: true,
      provider: "convex",
      configured: true,
      hasDeployKey: true,
    })
  })
})
