import { NextResponse } from "next/server"
import { addTask, readNotificationStore, updateTask } from "@/lib/notification-storage"

export const GET = async () => {
  const store = await readNotificationStore()
  return NextResponse.json(store.tasks)
}

export const POST = async (request: Request) => {
  const payload = (await request.json()) as Parameters<typeof addTask>[0]
  const task = await addTask(payload)
  return NextResponse.json(task)
}

export const PATCH = async (request: Request) => {
  const payload = (await request.json()) as {
    id: string
    updates: Parameters<typeof updateTask>[1]
  }

  const task = await updateTask(payload.id, payload.updates)
  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 })
  }

  return NextResponse.json(task)
}
