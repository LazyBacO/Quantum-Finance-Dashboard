import { NextRequest, NextResponse } from "next/server"
import { verifySession } from "@/lib/access-session"

const ACCESS_COOKIE = "onf_access"

function isBypassEnabled(): boolean {
  return process.env.ACCESS_CONTROL_BYPASS === "true"
}

export async function middleware(request: NextRequest) {
  if (isBypassEnabled()) return NextResponse.next()

  const isProd = process.env.NODE_ENV === "production"
  const secret = process.env.ACCESS_SESSION_SECRET
  if (isProd && !secret) {
    return NextResponse.redirect(new URL("/access?reason=config", request.url))
  }
  if (!secret) return NextResponse.next()

  const token = request.cookies.get(ACCESS_COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(new URL("/access", request.url))
  }

  const session = await verifySession(token, secret)
  if (!session) {
    const response = NextResponse.redirect(new URL("/access?reason=expired", request.url))
    response.cookies.delete(ACCESS_COOKIE)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|access).*)"],
}
