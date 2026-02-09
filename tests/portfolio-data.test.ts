import { afterEach, describe, expect, it, vi } from "vitest"
import {
  formatCurrencyFromCents,
  formatMonthYearFromIso,
  formatRelativeTimestampFromIso,
  parseCurrencyToCents,
} from "@/lib/portfolio-data"

describe("portfolio-data utilities", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("parses formatted currency strings into cents", () => {
    expect(parseCurrencyToCents("$1,234.56")).toBe(123_456)
    expect(parseCurrencyToCents("2500")).toBe(250_000)
    expect(parseCurrencyToCents("invalid")).toBe(0)
  })

  it("formats cents into USD currency string", () => {
    expect(formatCurrencyFromCents(123_456)).toBe("$1,234.56")
  })

  it("formats month-year labels from ISO date", () => {
    expect(formatMonthYearFromIso("2026-06-01T00:00:00.000Z")).toBe("Jun 2026")
  })

  it("formats relative timestamps for today and yesterday", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-03T12:00:00.000Z"))

    expect(formatRelativeTimestampFromIso("2026-03-03T09:15:00.000Z")).toMatch(/^Today,/)
    expect(formatRelativeTimestampFromIso("2026-03-02T09:15:00.000Z")).toMatch(/^Yesterday,/)
  })
})
