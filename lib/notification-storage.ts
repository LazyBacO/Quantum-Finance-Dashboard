import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import {
  alertCreateSchema,
  alertSchema,
  alertUpdateSchema,
  cadenceOptions,
  defaultNotificationPreferences,
  notificationPreferencesSchema,
  notificationStoreSchema,
  reminderOptions,
  taskCreateSchema,
  taskSchema,
  taskUpdateSchema,
  type AlertCreateInput,
  type AlertItem,
  type AlertUpdateInput,
  type NotificationPreferences,
  type NotificationStore,
  type TaskCreateInput,
  type TaskItem,
  type TaskUpdateInput,
} from "@/lib/notification-types"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "notifications.json")

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const nowIso = () => new Date().toISOString()
const createId = (prefix: "task" | "alert") => `${prefix}-${randomUUID()}`

const normalizeIsoDate = (value: unknown): string => {
  if (typeof value === "string" && ISO_DATE_REGEX.test(value)) {
    return value
  }
  return ""
}

const normalizeIsoDateTime = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }
  return parsed.toISOString()
}

const normalizeReminder = (value: unknown): TaskItem["reminder"] =>
  typeof value === "string" && reminderOptions.includes(value as TaskItem["reminder"])
    ? (value as TaskItem["reminder"])
    : reminderOptions[0]

const normalizeCadence = (value: unknown): AlertItem["cadence"] =>
  typeof value === "string" && cadenceOptions.includes(value as AlertItem["cadence"])
    ? (value as AlertItem["cadence"])
    : cadenceOptions[0]

const normalizeTask = (input: unknown): TaskItem => {
  const parsed = taskSchema.safeParse(input)
  if (parsed.success) {
    return parsed.data
  }

  const raw = input as Partial<TaskItem> | undefined
  const createdAt = normalizeIsoDateTime(raw?.createdAt, nowIso())
  return {
    id: typeof raw?.id === "string" && raw.id.trim().length > 0 ? raw.id : createId("task"),
    title:
      typeof raw?.title === "string" && raw.title.trim().length > 0
        ? raw.title.trim().slice(0, 160)
        : "Nouvelle tâche",
    dueDate: normalizeIsoDate(raw?.dueDate),
    reminder: normalizeReminder(raw?.reminder),
    notes:
      typeof raw?.notes === "string"
        ? raw.notes.slice(0, 2000)
        : "",
    channelEmail: typeof raw?.channelEmail === "boolean" ? raw.channelEmail : true,
    channelPush: typeof raw?.channelPush === "boolean" ? raw.channelPush : true,
    completed: typeof raw?.completed === "boolean" ? raw.completed : false,
    createdAt,
    updatedAt: normalizeIsoDateTime(raw?.updatedAt, createdAt),
    lastNotifiedAt:
      raw?.lastNotifiedAt === null
        ? null
        : normalizeIsoDateTime(raw?.lastNotifiedAt, "") || null,
  }
}

const normalizeAlert = (input: unknown): AlertItem => {
  const parsed = alertSchema.safeParse(input)
  if (parsed.success) {
    return parsed.data
  }

  const raw = input as Partial<AlertItem> | undefined
  const createdAt = normalizeIsoDateTime(raw?.createdAt, nowIso())
  return {
    id: typeof raw?.id === "string" && raw.id.trim().length > 0 ? raw.id : createId("alert"),
    title:
      typeof raw?.title === "string" && raw.title.trim().length > 0
        ? raw.title.trim().slice(0, 160)
        : "Nouvelle alerte",
    metric:
      typeof raw?.metric === "string" && raw.metric.trim().length > 0
        ? raw.metric.trim().slice(0, 120)
        : "Allocation",
    threshold:
      typeof raw?.threshold === "string" && raw.threshold.trim().length > 0
        ? raw.threshold.trim().slice(0, 120)
        : "Seuil à définir",
    cadence: normalizeCadence(raw?.cadence),
    channelEmail: typeof raw?.channelEmail === "boolean" ? raw.channelEmail : true,
    channelPush: typeof raw?.channelPush === "boolean" ? raw.channelPush : true,
    createdAt,
    updatedAt: normalizeIsoDateTime(raw?.updatedAt, createdAt),
    lastNotifiedAt:
      raw?.lastNotifiedAt === null
        ? null
        : normalizeIsoDateTime(raw?.lastNotifiedAt, "") || null,
  }
}

const normalizePreferences = (value: unknown): NotificationPreferences => {
  const parsed = notificationPreferencesSchema.safeParse(value)
  if (parsed.success) {
    return parsed.data
  }
  return defaultNotificationPreferences
}

const normalizeStore = (input: unknown): NotificationStore => {
  const parsed = notificationStoreSchema.safeParse(input)
  if (parsed.success) {
    return parsed.data
  }

  const raw = input as Partial<NotificationStore> | undefined
  const tasks = Array.isArray(raw?.tasks) ? raw.tasks.map((task) => normalizeTask(task)) : []
  const alerts = Array.isArray(raw?.alerts) ? raw.alerts.map((alert) => normalizeAlert(alert)) : []
  return {
    preferences: normalizePreferences(raw?.preferences),
    tasks,
    alerts,
  }
}

const createSeedTask = (overrides: Partial<TaskItem>): TaskItem => {
  const now = nowIso()
  return normalizeTask({
    id: overrides.id ?? createId("task"),
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
  })
}

const createSeedAlert = (overrides: Partial<AlertItem>): AlertItem => {
  const now = nowIso()
  return normalizeAlert({
    id: overrides.id ?? createId("alert"),
    title: overrides.title ?? "Nouvelle alerte",
    metric: overrides.metric ?? "Allocation",
    threshold: overrides.threshold ?? "Seuil à définir",
    cadence: overrides.cadence ?? cadenceOptions[0],
    channelEmail: overrides.channelEmail ?? true,
    channelPush: overrides.channelPush ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    lastNotifiedAt: overrides.lastNotifiedAt ?? null,
  })
}

const seedStore: NotificationStore = {
  preferences: defaultNotificationPreferences,
  tasks: [
    createSeedTask({
      id: "task-1",
      title: "Rebalancer le portefeuille",
      dueDate: "2026-08-28",
      reminder: "24 heures avant",
      notes: "Confirmer l'impact fiscal avant l'arbitrage.",
      channelEmail: true,
      channelPush: true,
    }),
    createSeedTask({
      id: "task-2",
      title: "Rapprocher les dividendes",
      dueDate: "2026-09-02",
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
    const parsed = JSON.parse(raw) as unknown
    return normalizeStore(parsed)
  } catch {
    const fallback = normalizeStore(seedStore)
    await writeNotificationStore(fallback)
    return fallback
  }
}

export const writeNotificationStore = async (store: NotificationStore): Promise<void> => {
  const validated = normalizeStore(store)
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(validated, null, 2), "utf-8")
}

export const addTask = async (input: TaskCreateInput) => {
  const parsed = taskCreateSchema.parse(input)
  const store = await readNotificationStore()
  const now = nowIso()
  const task: TaskItem = {
    ...parsed,
    id: createId("task"),
    createdAt: now,
    updatedAt: now,
    channelEmail: parsed.channelEmail ?? store.preferences.email,
    channelPush: parsed.channelPush ?? store.preferences.push,
    lastNotifiedAt: parsed.lastNotifiedAt ?? null,
  }
  store.tasks = [task, ...store.tasks]
  await writeNotificationStore(store)
  return task
}

export const updateTask = async (id: string, updates: TaskUpdateInput) => {
  const parsedUpdates = taskUpdateSchema.parse(updates)
  const store = await readNotificationStore()
  const now = nowIso()
  let updatedTask: TaskItem | null = null

  store.tasks = store.tasks.map((task) => {
    if (task.id !== id) {
      return task
    }
    updatedTask = taskSchema.parse({
      ...task,
      ...parsedUpdates,
      updatedAt: now,
    })
    return updatedTask
  })

  if (!updatedTask) {
    return null
  }

  await writeNotificationStore(store)
  return updatedTask
}

export const addAlert = async (input: AlertCreateInput) => {
  const parsed = alertCreateSchema.parse(input)
  const store = await readNotificationStore()
  const now = nowIso()
  const alert: AlertItem = {
    ...parsed,
    id: createId("alert"),
    createdAt: now,
    updatedAt: now,
    channelEmail: parsed.channelEmail ?? store.preferences.email,
    channelPush: parsed.channelPush ?? store.preferences.push,
    lastNotifiedAt: parsed.lastNotifiedAt ?? null,
  }
  store.alerts = [alert, ...store.alerts]
  await writeNotificationStore(store)
  return alert
}

export const updateAlert = async (id: string, updates: AlertUpdateInput) => {
  const parsedUpdates = alertUpdateSchema.parse(updates)
  const store = await readNotificationStore()
  const now = nowIso()
  let updatedAlert: AlertItem | null = null

  store.alerts = store.alerts.map((alert) => {
    if (alert.id !== id) {
      return alert
    }
    updatedAlert = alertSchema.parse({
      ...alert,
      ...parsedUpdates,
      updatedAt: now,
    })
    return updatedAlert
  })

  if (!updatedAlert) {
    return null
  }

  await writeNotificationStore(store)
  return updatedAlert
}

export const updatePreferences = async (preferences: NotificationPreferences) => {
  const parsedPreferences = notificationPreferencesSchema.parse(preferences)
  const store = await readNotificationStore()
  store.preferences = {
    ...store.preferences,
    ...parsedPreferences,
  }
  await writeNotificationStore(store)
  return store.preferences
}
