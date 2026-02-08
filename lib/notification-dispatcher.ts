import type { AlertItem, NotificationPreferences, TaskItem } from "@/lib/notification-types"
import { resolveNotificationChannels } from "@/lib/notification-scheduler"

export type NotificationDispatchPayload = {
  id: string
  title: string
  description: string
  channels: {
    email: boolean
    push: boolean
  }
  triggeredAt: string
  source: "task" | "alert"
}

export const dispatchTaskNotification = (
  task: TaskItem,
  preferences: NotificationPreferences
): NotificationDispatchPayload => {
  const channels = resolveNotificationChannels(preferences, {
    channelEmail: task.channelEmail,
    channelPush: task.channelPush,
  })

  return {
    id: task.id,
    title: `Rappel: ${task.title}`,
    description: task.notes || "Tâche planifiée",
    channels,
    triggeredAt: new Date().toISOString(),
    source: "task",
  }
}

export const dispatchAlertNotification = (
  alert: AlertItem,
  preferences: NotificationPreferences
): NotificationDispatchPayload => {
  const channels = resolveNotificationChannels(preferences, {
    channelEmail: alert.channelEmail,
    channelPush: alert.channelPush,
  })

  return {
    id: alert.id,
    title: `Alerte: ${alert.title}`,
    description: `${alert.metric} · Seuil ${alert.threshold}`,
    channels,
    triggeredAt: new Date().toISOString(),
    source: "alert",
  }
}
