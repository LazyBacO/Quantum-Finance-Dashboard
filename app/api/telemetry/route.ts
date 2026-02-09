import { promises as fs } from "fs"
import path from "path"
import { z } from "zod"

const telemetrySchema = z.object({
  type: z.enum(["client-error", "client-rejection", "navigation-perf", "web-vital"]),
  name: z.string().min(1).max(120),
  value: z.number().finite().optional(),
  rating: z.string().min(1).max(32).optional(),
  delta: z.number().finite().optional(),
  id: z.string().min(1).max(120).optional(),
  message: z.string().max(2000).optional(),
  stack: z.string().max(8000).optional(),
  url: z.string().max(500).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
})

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "telemetry.jsonl")

const appendTelemetry = async (payload: z.infer<typeof telemetrySchema>) => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const line = `${JSON.stringify({ ...payload, receivedAt: new Date().toISOString() })}\n`
  await fs.appendFile(DATA_PATH, line, "utf-8")
}

export const POST = async (request: Request) => {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = telemetrySchema.safeParse(payload)
  if (!parsed.success) {
    return new Response(null, { status: 400 })
  }

  await appendTelemetry(parsed.data)
  return new Response(null, { status: 204 })
}
