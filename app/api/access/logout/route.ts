import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: "onf_access",
    value: "",
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  })
  return response
}
