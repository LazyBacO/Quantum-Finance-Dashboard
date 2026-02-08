import { NextResponse } from "next/server"
import { runNotificationScan } from "@/lib/notification-trigger"

export const GET = async () => {
  const result = await runNotificationScan()
  return NextResponse.json(result)
}

export const POST = async () => {
  const result = await runNotificationScan()
  return NextResponse.json(result)
}
