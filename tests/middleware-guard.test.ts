import { describe, expect, it } from "vitest"

function shouldBlock(hasCookie: boolean, bypass: boolean, hasSecret: boolean, isProd: boolean): boolean {
  if (bypass) return false
  if (isProd && !hasSecret) return true
  if (!hasSecret) return false
  return !hasCookie
}

describe("middleware guard logic", () => {
  it("bloque sans cookie", () => {
    expect(shouldBlock(false, false, true, true)).toBe(true)
  })

  it("autorise en bypass dev", () => {
    expect(shouldBlock(false, true, false, false)).toBe(false)
  })
})
