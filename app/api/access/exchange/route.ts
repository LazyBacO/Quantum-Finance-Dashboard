import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { validateAccessKeyWithService } from "@/lib/access-control-client"
import { signSession } from "@/lib/access-session"

const schema = z.object({ key: z.string().min(12).max(256) })
const ACCESS_COOKIE = "onf_access"

function computeExpiry(type: "one_time" | "temporary" | "permanent", expiresAt?: string | null): number {
  if (type === "permanent") return Date.now() + 30 * 24 * 3600_000
  if (expiresAt) return new Date(expiresAt).getTime()
  return Date.now() + 12 * 3600_000
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

    const exp = computeExpiry(validated.type, validated.expiresAt)
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
      expires: new Date(exp),
    })
    return response
  } catch {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ ok: false, error: "access_service_unavailable" }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: "access_service_error_dev" }, { status: 503 })
  }
}
