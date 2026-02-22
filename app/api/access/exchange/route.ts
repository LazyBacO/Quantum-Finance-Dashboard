import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { validateAccessKeyWithService } from "@/lib/access-control-client"
import { signSession } from "@/lib/access-session"

const schema = z.object({ key: z.string().min(12).max(256) })
const ACCESS_COOKIE = "onf_access"

function computeExpiry(expiresAt?: string | null): number {
  const ttlMinutesRaw = Number(process.env.ACCESS_SESSION_TTL_MINUTES || 15)
  const ttlMinutes = Number.isFinite(ttlMinutesRaw) && ttlMinutesRaw > 0 ? ttlMinutesRaw : 15
  const sessionExpiry = Date.now() + ttlMinutes * 60_000

  if (!expiresAt) return sessionExpiry

  const keyExpiry = new Date(expiresAt).getTime()
  if (!Number.isFinite(keyExpiry)) return sessionExpiry

  // Never allow session to outlive the key itself.
  return Math.min(sessionExpiry, keyExpiry)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
  }

  const secret = process.env.ACCESS_SESSION_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: "missing_session_secret" }, { status: 500 })
  }

  try {
    const validated = await validateAccessKeyWithService(parsed.data.key)
    if (!validated.ok || !validated.type || !validated.keyId) {
      return NextResponse.json({ ok: false, error: validated.error || "invalid_key" }, { status: 401 })
    }

    const exp = computeExpiry(validated.expiresAt)
    if (Date.now() >= exp) {
      return NextResponse.json({ ok: false, error: "key_expired" }, { status: 401 })
    }

    const token = await signSession(
      {
        keyId: validated.keyId,
        type: validated.type,
        iat: Date.now(),
        exp,
      },
      secret,
    )

    const response = NextResponse.json({ ok: true })
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Session cookie: removed when browser/app fully closes.
    })
    return response
  } catch {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ ok: false, error: "access_service_unavailable" }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: "access_service_error_dev" }, { status: 503 })
  }
}
