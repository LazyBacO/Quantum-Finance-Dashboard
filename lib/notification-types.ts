export type NotificationPreferences = {
  email: boolean
  push: boolean
}

export type TaskItem = {
  id: string
  title: string
  dueDate: string
  reminder: string
  notes: string
  channelEmail?: boolean
  channelPush?: boolean
  completed: boolean
  createdAt: string
  updatedAt: string
  lastNotifiedAt?: string | null
}

export type AlertItem = {
  id: string
  title: string
  metric: string
  threshold: string
  cadence: string
  channelEmail?: boolean
  channelPush?: boolean
  createdAt: string
  updatedAt: string
  lastNotifiedAt?: string | null
}

export type NotificationStore = {
  tasks: TaskItem[]
  alerts: AlertItem[]
  preferences: NotificationPreferences
}

export const reminderOptions = ["Aucun", "1 heure avant", "24 heures avant", "1 semaine avant"]

export const cadenceOptions = ["Temps réel", "Quotidien", "Hebdomadaire", "Mensuel"]

export const defaultNotificationPreferences: NotificationPreferences = {
  email: true,
  push: true,
}
