import { NextResponse } from "next/server"
import { addAlert, readNotificationStore, updateAlert } from "@/lib/notification-storage"

export const GET = async () => {
  const store = await readNotificationStore()
  return NextResponse.json(store.alerts)
}

export const POST = async (request: Request) => {
  const payload = (await request.json()) as Parameters<typeof addAlert>[0]
  const alert = await addAlert(payload)
  return NextResponse.json(alert)
}

export const PATCH = async (request: Request) => {
  const payload = (await request.json()) as {
    id: string
    updates: Parameters<typeof updateAlert>[1]
  }

  const alert = await updateAlert(payload.id, payload.updates)
  if (!alert) {
    return NextResponse.json({ message: "Alert not found" }, { status: 404 })
  }

  return NextResponse.json(alert)
}
