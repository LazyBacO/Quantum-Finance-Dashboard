import { existsSync } from "node:fs"
import { join } from "node:path"
import { spawnSync, spawn } from "node:child_process"

const rootDir = process.cwd()
const buildIdPath = join(rootDir, ".next", "BUILD_ID")

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(buildIdPath)) {
  console.log("[e2e] No Next.js build found, running `pnpm build`...")
  run("pnpm", ["build"])
}

const startArgs = ["start"]
const server = spawn("pnpm", startArgs, {
  cwd: rootDir,
  stdio: "inherit",
  shell: process.platform === "win32",
})

const shutdown = (signal) => {
  if (!server.killed) {
    server.kill(signal)
  }
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))

server.on("exit", (code) => {
  process.exit(code ?? 0)
})
