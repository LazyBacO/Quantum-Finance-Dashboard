import {
  dispatchAlertNotification,
  dispatchTaskNotification,
  type NotificationDispatchPayload,
} from "@/lib/notification-dispatcher"
import {
  getNextAlertNotificationAt,
  getNextTaskNotificationAt,
} from "@/lib/notification-scheduler"
import {
  readNotificationStore,
  updateAlert,
  updateTask,
} from "@/lib/notification-storage"

export type NotificationScanResult = {
  triggered: NotificationDispatchPayload[]
}

export const runNotificationScan = async (): Promise<NotificationScanResult> => {
  const store = await readNotificationStore()
  const now = new Date()
  const triggered: NotificationDispatchPayload[] = []

  for (const task of store.tasks) {
    const nextAt = getNextTaskNotificationAt(task, now)
    if (!nextAt) {
      continue
    }
    const lastNotified = task.lastNotifiedAt ? new Date(task.lastNotifiedAt) : null
    if (lastNotified && lastNotified.getTime() >= nextAt.getTime()) {
      continue
    }

    triggered.push(dispatchTaskNotification(task, store.preferences))
    await updateTask(task.id, { lastNotifiedAt: now.toISOString() })
  }

  for (const alert of store.alerts) {
    const nextAt = getNextAlertNotificationAt(alert, now)
    if (!nextAt) {
      continue
    }
    const lastNotified = alert.lastNotifiedAt ? new Date(alert.lastNotifiedAt) : null
    if (lastNotified && lastNotified.getTime() >= nextAt.getTime()) {
      continue
    }

    triggered.push(dispatchAlertNotification(alert, store.preferences))
    await updateAlert(alert.id, { lastNotifiedAt: now.toISOString() })
  }

  return { triggered }
}
