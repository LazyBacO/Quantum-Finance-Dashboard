import type {
  AlertItem,
  NotificationPreferences,
  TaskItem,
} from "@/lib/notification-types"

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new Error("Erreur réseau")
  }
  return response.json() as Promise<T>
}

export const getTasks = async (): Promise<TaskItem[]> => {
  return fetchJson<TaskItem[]>("/api/tasks")
}

export const createTask = async (
  task: Omit<TaskItem, "id" | "createdAt" | "updatedAt">
): Promise<TaskItem> => {
  return fetchJson<TaskItem>("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  })
}

export const updateTask = async (
  id: string,
  updates: Partial<Omit<TaskItem, "id" | "createdAt">>
): Promise<TaskItem> => {
  return fetchJson<TaskItem>("/api/tasks", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, updates }),
  })
}

export const getAlerts = async (): Promise<AlertItem[]> => {
  return fetchJson<AlertItem[]>("/api/alerts")
}

export const createAlert = async (
  alert: Omit<AlertItem, "id" | "createdAt" | "updatedAt">
): Promise<AlertItem> => {
  return fetchJson<AlertItem>("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(alert),
  })
}

export const updateAlert = async (
  id: string,
  updates: Partial<Omit<AlertItem, "id" | "createdAt">>
): Promise<AlertItem> => {
  return fetchJson<AlertItem>("/api/alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, updates }),
  })
}

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  return fetchJson<NotificationPreferences>("/api/notification-preferences")
}

export const saveNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  return fetchJson<NotificationPreferences>("/api/notification-preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  })
}
