import { describe, expect, it } from "vitest"
import { signSession, verifySession } from "@/lib/access-session"

describe("access session", () => {
  it("signe et vérifie un token", async () => {
    const token = await signSession(
      { keyId: "abc", type: "permanent", iat: Date.now(), exp: Date.now() + 60_000 },
      "secret-test",
    )

    const payload = await verifySession(token, "secret-test")
    expect(payload?.keyId).toBe("abc")
  })

  it("rejette un token expiré", async () => {
    const token = await signSession(
      { keyId: "abc", type: "temporary", iat: Date.now() - 10_000, exp: Date.now() - 1_000 },
      "secret-test",
    )

    const payload = await verifySession(token, "secret-test")
    expect(payload).toBeNull()
  })
})
