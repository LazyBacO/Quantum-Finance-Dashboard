import { describe, expect, it } from "vitest"
import {
  normalizeMarketDataRequestConfig,
  normalizeMarketProvider,
  parseMarketDataRequestHeaders,
} from "@/lib/market-data-config"

describe("market data config", () => {
  it("normalizes provider values", () => {
    expect(normalizeMarketProvider("auto")).toBe("auto")
    expect(normalizeMarketProvider("twelvedata")).toBe("twelvedata")
    expect(normalizeMarketProvider("massive")).toBe("massive")
    expect(normalizeMarketProvider("  TwElVeDaTa ")).toBe("twelvedata")
    expect(normalizeMarketProvider(" MASSIVE ")).toBe("massive")
    expect(normalizeMarketProvider("unknown")).toBe("auto")
  })

  it("parses market provider headers with keys", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-market-provider": "  TWELVEDATA  ",
        "x-massive-api-key": "massive-key",
        "x-twelvedata-api-key": "twelve-key",
      },
    })

    const parsed = parseMarketDataRequestHeaders(request)
    expect(parsed.provider).toBe("twelvedata")
    expect(parsed.massiveApiKey).toBe("massive-key")
    expect(parsed.twelveDataApiKey).toBe("twelve-key")
  })

  it("fills defaults for missing config", () => {
    const normalized = normalizeMarketDataRequestConfig(undefined)
    expect(normalized.provider).toBe("auto")
    expect(normalized.massiveApiKey).toBeUndefined()
    expect(normalized.twelveDataApiKey).toBeUndefined()
  })
})
