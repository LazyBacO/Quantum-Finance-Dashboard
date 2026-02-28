import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const expected = process.env.HEALTHCHECK_SECRET
  if (!expected) return false
  const provided = request.headers.get("x-health-secret")
  return provided === expected
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const hasDeployKey = Boolean(process.env.CONVEX_DEPLOY_KEY)

  if (!convexUrl) {
    return NextResponse.json(
      {
        ok: false,
        provider: "convex",
        configured: false,
        reason: "Missing NEXT_PUBLIC_CONVEX_URL",
      },
      { status: 503 },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      provider: "convex",
      configured: true,
      hasDeployKey,
    },
    { status: 200 },
  )
}
