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
const vitestArgs = ["vitest", ...args]

const child = spawn("pnpm", vitestArgs, {
  stdio: "inherit",
  shell: isWindows,
  env: process.env,
})

child.on("exit", code => {
  process.exit(code ?? 1)
})
