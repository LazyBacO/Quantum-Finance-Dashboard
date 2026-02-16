import { mkdirSync } from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"

const isWindows = process.platform === "win32"

if (isWindows) {
  const tmpDir = path.join(process.cwd(), ".tmp")
  mkdirSync(tmpDir, { recursive: true })
  process.env.TEMP = tmpDir
  process.env.TMP = tmpDir
  process.env.TMPDIR = tmpDir
}

const args = process.argv.slice(2)
const vitestCli = path.join(
  process.cwd(),
  "node_modules",
  "vitest",
  "vitest.mjs",
)

const child = spawn(process.execPath, [vitestCli, ...args], {
  stdio: "inherit",
  shell: false,
  env: process.env,
})

child.on("exit", code => {
  process.exit(code ?? 1)
})
