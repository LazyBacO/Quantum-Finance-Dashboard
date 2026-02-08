import type { AlertItem, NotificationPreferences, TaskItem } from "@/lib/notification-types"

const REMINDER_OFFSETS: Record<string, number> = {
  "1 heure avant": 60 * 60 * 1000,
  "24 heures avant": 24 * 60 * 60 * 1000,
  "1 semaine avant": 7 * 24 * 60 * 60 * 1000,
}

const CADENCE_OFFSETS: Record<string, number> = {
  Quotidien: 24 * 60 * 60 * 1000,
  Hebdomadaire: 7 * 24 * 60 * 60 * 1000,
  Mensuel: 30 * 24 * 60 * 60 * 1000,
}

export type ResolvedChannels = {
  email: boolean
  push: boolean
}

export const resolveNotificationChannels = (
  preferences: NotificationPreferences,
  overrides?: { channelEmail?: boolean; channelPush?: boolean }
): ResolvedChannels => {
  return {
    email: overrides?.channelEmail ?? preferences.email,
    push: overrides?.channelPush ?? preferences.push,
  }
}

const getDueDateTime = (dueDate: string): Date | null => {
  if (!dueDate) {
    return null
  }

  const date = new Date(`${dueDate}T09:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

export const getNextTaskNotificationAt = (task: TaskItem, now: Date): Date | null => {
  if (task.completed || task.reminder === "Aucun") {
    return null
  }

  const dueDateTime = getDueDateTime(task.dueDate)
  if (!dueDateTime) {
    return null
  }

  const offset = REMINDER_OFFSETS[task.reminder] ?? 0
  const reminderTime = new Date(dueDateTime.getTime() - offset)

  if (reminderTime.getTime() > now.getTime()) {
    return reminderTime
  }

  if (dueDateTime.getTime() > now.getTime()) {
    return now
  }

  return null
}

export const getNextAlertNotificationAt = (alert: AlertItem, now: Date): Date | null => {
  if (alert.cadence === "Temps réel") {
    return now
  }

  const cadenceOffset = CADENCE_OFFSETS[alert.cadence]
  if (!cadenceOffset) {
    return now
  }

  if (!alert.lastNotifiedAt) {
    return now
  }

  const lastNotifiedDate = new Date(alert.lastNotifiedAt)
  if (Number.isNaN(lastNotifiedDate.getTime())) {
    return now
  }

  const next = new Date(lastNotifiedDate.getTime() + cadenceOffset)
  return next.getTime() > now.getTime() ? next : now
}

export const formatNotificationDate = (date: Date): string => {
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
