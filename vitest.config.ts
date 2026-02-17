import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  cacheDir: ".tmp/vitest",
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
