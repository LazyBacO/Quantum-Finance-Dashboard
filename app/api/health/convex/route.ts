import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
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
