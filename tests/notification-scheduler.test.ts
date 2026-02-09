import { describe, expect, it } from "vitest"
import {
  getNextAlertNotificationAt,
  getNextTaskNotificationAt,
  resolveNotificationChannels,
} from "@/lib/notification-scheduler"
import type { AlertItem, TaskItem } from "@/lib/notification-types"

const baseTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: "task-1",
  title: "Task",
  dueDate: "2026-03-10",
  reminder: "24 heures avant",
  notes: "",
  channelEmail: true,
  channelPush: true,
  completed: false,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  lastNotifiedAt: null,
  ...overrides,
})

const baseAlert = (overrides: Partial<AlertItem> = {}): AlertItem => ({
  id: "alert-1",
  title: "Alert",
  metric: "Risk",
  threshold: "> 10%",
  cadence: "Quotidien",
  channelEmail: true,
  channelPush: true,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  lastNotifiedAt: null,
  ...overrides,
})

describe("notification scheduler", () => {
  it("resolves notification channels with overrides", () => {
    expect(resolveNotificationChannels({ email: true, push: false })).toEqual({
      email: true,
      push: false,
    })
    expect(
      resolveNotificationChannels(
        { email: true, push: false },
        { channelEmail: false, channelPush: true }
      )
    ).toEqual({
      email: false,
      push: true,
    })
  })

  it("returns null for completed tasks or no reminder", () => {
    const now = new Date("2026-03-05T12:00:00.000Z")
    expect(getNextTaskNotificationAt(baseTask({ completed: true }), now)).toBeNull()
    expect(getNextTaskNotificationAt(baseTask({ reminder: "Aucun" }), now)).toBeNull()
  })

  it("schedules next task reminder or immediate trigger before due date", () => {
    const beforeReminder = new Date("2026-03-08T08:00:00.000Z")
    const immediateWindow = new Date("2026-03-10T08:30:00.000Z")

    const scheduled = getNextTaskNotificationAt(baseTask(), beforeReminder)
    expect(scheduled).not.toBeNull()
    expect(scheduled!.getTime()).toBeGreaterThan(beforeReminder.getTime())

    const immediate = getNextTaskNotificationAt(baseTask(), immediateWindow)
    expect(immediate?.getTime()).toBe(immediateWindow.getTime())
  })

  it("returns null for past due tasks", () => {
    const now = new Date("2026-03-11T12:00:00.000Z")
    expect(getNextTaskNotificationAt(baseTask(), now)).toBeNull()
  })

  it("handles alert cadence timing", () => {
    const now = new Date("2026-03-10T12:00:00.000Z")

    const realtime = getNextAlertNotificationAt(baseAlert({ cadence: "Temps réel" }), now)
    expect(realtime?.getTime()).toBe(now.getTime())

    const future = getNextAlertNotificationAt(
      baseAlert({ lastNotifiedAt: "2026-03-10T11:30:00.000Z" }),
      now
    )
    expect(future).not.toBeNull()
    expect(future!.getTime()).toBeGreaterThan(now.getTime())

    const due = getNextAlertNotificationAt(
      baseAlert({ lastNotifiedAt: "2026-03-08T11:30:00.000Z" }),
      now
    )
    expect(due?.getTime()).toBe(now.getTime())
  })
})
