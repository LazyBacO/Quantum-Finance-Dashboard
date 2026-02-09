import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserPortfolioState, setUserPortfolioState } from "@/lib/portfolio-sync-storage"
import { portfolioSyncStateSchema } from "@/lib/portfolio-sync-types"

const syncKeySchema = z.string().min(16).max(256)

const readSyncKey = (request: Request): string | null => {
  const fromHeader = request.headers.get("x-sync-key")
  if (fromHeader && fromHeader.trim().length > 0) {
    return fromHeader.trim()
  }

  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim()
    if (token.length > 0) {
      return token
    }
  }

  return null
}

const unauthorized = () =>
  NextResponse.json(
    {
      message:
        "Missing synchronization key. Provide `x-sync-key` header or `Authorization: Bearer <sync_key>`.",
    },
    { status: 401 }
  )

export const GET = async (request: Request) => {
  const syncKey = readSyncKey(request)
  if (!syncKey) {
    return unauthorized()
  }

  const parsedKey = syncKeySchema.safeParse(syncKey)
  if (!parsedKey.success) {
    return NextResponse.json({ message: "Invalid synchronization key format." }, { status: 400 })
  }

  const state = await getUserPortfolioState(parsedKey.data)
  return NextResponse.json(
    {
      state,
      hasState: Boolean(state),
    },
    { status: 200 }
  )
}

export const PUT = async (request: Request) => {
  const syncKey = readSyncKey(request)
  if (!syncKey) {
    return unauthorized()
  }

  const parsedKey = syncKeySchema.safeParse(syncKey)
  if (!parsedKey.success) {
    return NextResponse.json({ message: "Invalid synchronization key format." }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 })
  }

  const parsedPayload = z
    .object({
      state: portfolioSyncStateSchema,
    })
    .safeParse(payload)

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        message: "Invalid portfolio payload.",
        details: parsedPayload.error.issues.slice(0, 3).map((issue) => issue.message),
      },
      { status: 400 }
    )
  }

  const state = await setUserPortfolioState(parsedKey.data, parsedPayload.data.state)
  return NextResponse.json({ state }, { status: 200 })
}
