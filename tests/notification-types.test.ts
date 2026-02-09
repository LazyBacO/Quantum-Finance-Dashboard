import { describe, expect, it } from "vitest"
import {
  alertCreateSchema,
  notificationStoreSchema,
  taskCreateSchema,
} from "@/lib/notification-types"

describe("notification schemas", () => {
  it("accepts valid task creation payload", () => {
    const result = taskCreateSchema.safeParse({
      title: "Préparer revue trimestrielle",
      dueDate: "2026-04-15",
      reminder: "24 heures avant",
      notes: "",
      channelEmail: true,
      channelPush: false,
      completed: false,
      lastNotifiedAt: null,
    })

    expect(result.success).toBe(true)
  })

  it("rejects invalid alert cadence", () => {
    const result = alertCreateSchema.safeParse({
      title: "Alerte test",
      metric: "Risk",
      threshold: "> 5%",
      cadence: "INVALID",
      channelEmail: true,
      channelPush: true,
      lastNotifiedAt: null,
    })

    expect(result.success).toBe(false)
  })

  it("validates complete notification store structure", () => {
    const result = notificationStoreSchema.safeParse({
      preferences: {
        email: true,
        push: true,
      },
      tasks: [
        {
          id: "task-1",
          title: "Task 1",
          dueDate: "2026-04-10",
          reminder: "1 heure avant",
          notes: "",
          channelEmail: true,
          channelPush: true,
          completed: false,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          lastNotifiedAt: null,
        },
      ],
      alerts: [
        {
          id: "alert-1",
          title: "Alert 1",
          metric: "Cash",
          threshold: "< 10 000 €",
          cadence: "Quotidien",
          channelEmail: true,
          channelPush: false,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          lastNotifiedAt: null,
        },
      ],
    })

    expect(result.success).toBe(true)
  })
})
