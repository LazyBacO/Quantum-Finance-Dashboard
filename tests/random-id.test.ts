import { describe, expect, it } from "vitest"
import { createPrefixedId, createSecureHex, createSyncKey, createUuidLike } from "@/lib/random-id"

describe("random-id", () => {
  it("creates secure hex of expected length", () => {
    const value = createSecureHex(40)
    expect(value).toMatch(/^[0-9a-f]{40}$/)
  })

  it("throws when requested length is invalid", () => {
    expect(() => createSecureHex(0)).toThrow()
    expect(() => createSecureHex(3.14)).toThrow()
  })

  it("creates uuid-like values", () => {
    const value = createUuidLike()
    expect(value).toMatch(/^[0-9a-f-]{20,}$/i)
  })

  it("creates prefixed identifiers", () => {
    const value = createPrefixedId("analysis")
    expect(value.startsWith("analysis-")).toBe(true)
  })

  it("creates sync keys with configurable size", () => {
    expect(createSyncKey().length).toBe(32)
    expect(createSyncKey(64)).toHaveLength(64)
  })
})
