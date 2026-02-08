import { NextResponse } from "next/server"
import { updatePreferences, readNotificationStore } from "@/lib/notification-storage"

export const GET = async () => {
  const store = await readNotificationStore()
  return NextResponse.json(store.preferences)
}

export const PUT = async (request: Request) => {
  const payload = (await request.json()) as Parameters<typeof updatePreferences>[0]
  const preferences = await updatePreferences(payload)
  return NextResponse.json(preferences)
}
