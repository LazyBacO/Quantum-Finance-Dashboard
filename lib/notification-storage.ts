import { promises as fs } from "fs"
import path from "path"
import {
  cadenceOptions,
  defaultNotificationPreferences,
  reminderOptions,
  type AlertItem,
  type NotificationStore,
  type TaskItem,
} from "@/lib/notification-types"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "notifications.json")

const createSeedTask = (overrides: Partial<TaskItem>): TaskItem => {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? `task-${Date.now()}`,
    title: overrides.title ?? "Nouvelle tâche",
    dueDate: overrides.dueDate ?? "",
    reminder: overrides.reminder ?? reminderOptions[0],
    notes: overrides.notes ?? "",
    channelEmail: overrides.channelEmail ?? true,
    channelPush: overrides.channelPush ?? true,
    completed: overrides.completed ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    lastNotifiedAt: overrides.lastNotifiedAt ?? null,
  }
}

const createSeedAlert = (overrides: Partial<AlertItem>): AlertItem => {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? `alert-${Date.now()}`,
    title: overrides.title ?? "Nouvelle alerte",
    metric: overrides.metric ?? "Allocation",
    threshold: overrides.threshold ?? "",
    cadence: overrides.cadence ?? cadenceOptions[0],
    channelEmail: overrides.channelEmail ?? true,
    channelPush: overrides.channelPush ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    lastNotifiedAt: overrides.lastNotifiedAt ?? null,
  }
}

const seedStore: NotificationStore = {
  preferences: defaultNotificationPreferences,
  tasks: [
    createSeedTask({
      id: "task-1",
      title: "Rebalancer le portefeuille",
      dueDate: "2024-08-28",
      reminder: "24 heures avant",
      notes: "Confirmer l'impact fiscal avant l'arbitrage.",
      channelEmail: true,
      channelPush: true,
    }),
    createSeedTask({
      id: "task-2",
      title: "Rapprocher les dividendes",
      dueDate: "2024-09-02",
      reminder: "1 semaine avant",
      notes: "Comparer avec les prévisions trimestrielles.",
      channelEmail: true,
      channelPush: false,
    }),
  ],
  alerts: [
    createSeedAlert({
      id: "alert-1",
      title: "Seuil de volatilité",
      metric: "Risque",
      threshold: "> 12%",
      cadence: "Temps réel",
      channelEmail: true,
      channelPush: true,
    }),
    createSeedAlert({
      id: "alert-2",
      title: "Liquidité minimale",
      metric: "Cash",
      threshold: "< 15 000 €",
      cadence: "Quotidien",
      channelEmail: true,
      channelPush: false,
    }),
  ],
}

const ensureStoreFile = async (): Promise<void> => {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(seedStore, null, 2), "utf-8")
  }
}

export const readNotificationStore = async (): Promise<NotificationStore> => {
  await ensureStoreFile()
  const raw = await fs.readFile(DATA_PATH, "utf-8")
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationStore>
    return {
      preferences: {
        ...defaultNotificationPreferences,
        ...parsed.preferences,
      },
      tasks: parsed.tasks ?? seedStore.tasks,
      alerts: parsed.alerts ?? seedStore.alerts,
    }
  } catch {
    return seedStore
  }
}

export const writeNotificationStore = async (store: NotificationStore): Promise<void> => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export const addTask = async (input: Omit<TaskItem, "id" | "createdAt" | "updatedAt">) => {
  const store = await readNotificationStore()
  const now = new Date().toISOString()
  const task: TaskItem = {
    ...input,
    id: `task-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  store.tasks = [task, ...store.tasks]
  await writeNotificationStore(store)
  return task
}

export const updateTask = async (
  id: string,
  updates: Partial<Omit<TaskItem, "id" | "createdAt">>
) => {
  const store = await readNotificationStore()
  const now = new Date().toISOString()
  let updatedTask: TaskItem | null = null
  store.tasks = store.tasks.map((task) => {
    if (task.id !== id) {
      return task
    }
    updatedTask = {
      ...task,
      ...updates,
      updatedAt: now,
    }
    return updatedTask
  })
  await writeNotificationStore(store)
  return updatedTask
}

export const addAlert = async (
  input: Omit<AlertItem, "id" | "createdAt" | "updatedAt">
) => {
  const store = await readNotificationStore()
  const now = new Date().toISOString()
  const alert: AlertItem = {
    ...input,
    id: `alert-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  store.alerts = [alert, ...store.alerts]
  await writeNotificationStore(store)
  return alert
}

export const updateAlert = async (
  id: string,
  updates: Partial<Omit<AlertItem, "id" | "createdAt">>
) => {
  const store = await readNotificationStore()
  const now = new Date().toISOString()
  let updatedAlert: AlertItem | null = null
  store.alerts = store.alerts.map((alert) => {
    if (alert.id !== id) {
      return alert
    }
    updatedAlert = {
      ...alert,
      ...updates,
      updatedAt: now,
    }
    return updatedAlert
  })
  await writeNotificationStore(store)
  return updatedAlert
}

export const updatePreferences = async (preferences: NotificationStore["preferences"]) => {
  const store = await readNotificationStore()
  store.preferences = {
    ...store.preferences,
    ...preferences,
  }
  await writeNotificationStore(store)
  return store.preferences
}
