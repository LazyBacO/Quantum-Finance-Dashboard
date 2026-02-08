"use client"

import { useMemo, useState, type FormEvent } from "react"
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import Alerts from "./alerts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface AlertsNotificationsProps {
  className?: string
}

type TaskItem = {
  id: string
  title: string
  dueDate: string
  reminder: string
  notes: string
  channelEmail: boolean
  channelPush: boolean
  completed: boolean
}

type AlertItem = {
  id: string
  title: string
  metric: string
  threshold: string
  cadence: string
  channelEmail: boolean
  channelPush: boolean
}

const inputClasses =
  "w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"

const reminderOptions = ["Aucun", "1 heure avant", "24 heures avant", "1 semaine avant"]
const cadenceOptions = ["Temps réel", "Quotidien", "Hebdomadaire", "Mensuel"]

export default function AlertsNotifications({ className }: AlertsNotificationsProps) {
  const [taskForm, setTaskForm] = useState({
    title: "",
    dueDate: "",
    reminder: reminderOptions[1],
    notes: "",
    channelEmail: true,
    channelPush: true,
  })
  const [alertForm, setAlertForm] = useState({
    title: "",
    metric: "Allocation",
    threshold: "",
    cadence: cadenceOptions[0],
    channelEmail: true,
    channelPush: false,
  })
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: "task-1",
      title: "Rebalancer le portefeuille",
      dueDate: "2024-08-28",
      reminder: "24 heures avant",
      notes: "Confirmer l'impact fiscal avant l'arbitrage.",
      channelEmail: true,
      channelPush: true,
      completed: false,
    },
    {
      id: "task-2",
      title: "Rapprocher les dividendes",
      dueDate: "2024-09-02",
      reminder: "1 semaine avant",
      notes: "Comparer avec les prévisions trimestrielles.",
      channelEmail: true,
      channelPush: false,
      completed: false,
    },
  ])
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: "alert-1",
      title: "Seuil de volatilité",
      metric: "Risque",
      threshold: "> 12%",
      cadence: "Temps réel",
      channelEmail: true,
      channelPush: true,
    },
    {
      id: "alert-2",
      title: "Liquidité minimale",
      metric: "Cash",
      threshold: "< 15 000 €",
      cadence: "Quotidien",
      channelEmail: true,
      channelPush: false,
    },
  ])

  const upcomingReminders = useMemo(
    () => tasks.filter((task) => !task.completed && task.reminder !== "Aucun"),
    [tasks]
  )

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!taskForm.title.trim()) {
      return
    }

    setTasks((prev) => [
      {
        id: `task-${Date.now()}`,
        title: taskForm.title.trim(),
        dueDate: taskForm.dueDate,
        reminder: taskForm.reminder,
        notes: taskForm.notes.trim(),
        channelEmail: taskForm.channelEmail,
        channelPush: taskForm.channelPush,
        completed: false,
      },
      ...prev,
    ])
    setTaskForm({
      title: "",
      dueDate: "",
      reminder: reminderOptions[1],
      notes: "",
      channelEmail: true,
      channelPush: true,
    })
  }

  const handleAlertSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!alertForm.title.trim()) {
      return
    }

    setAlerts((prev) => [
      {
        id: `alert-${Date.now()}`,
        title: alertForm.title.trim(),
        metric: alertForm.metric.trim() || "Personnalisé",
        threshold: alertForm.threshold.trim() || "Seuil à définir",
        cadence: alertForm.cadence,
        channelEmail: alertForm.channelEmail,
        channelPush: alertForm.channelPush,
      },
      ...prev,
    ])
    setAlertForm({
      title: "",
      metric: "Allocation",
      threshold: "",
      cadence: cadenceOptions[0],
      channelEmail: true,
      channelPush: false,
    })
  }

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Tâches planifiées</p>
              <p className="text-2xl font-semibold text-foreground">{tasks.length}</p>
            </div>
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-500">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Suivi des actions à mener pour sécuriser vos décisions d'investissement.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Alertes actives</p>
              <p className="text-2xl font-semibold text-foreground">{alerts.length}</p>
            </div>
            <div className="rounded-full border border-rose-500/30 bg-rose-500/10 p-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Recevez des notifications lorsque vos seuils critiques sont atteints.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Rappels à venir</p>
              <p className="text-2xl font-semibold text-foreground">{upcomingReminders.length}</p>
            </div>
            <div className="rounded-full border border-blue-500/30 bg-blue-500/10 p-2 text-blue-500">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Notifications planifiées liées à vos évènements et tâches.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Alerts className="w-full" />

          <div className="fx-panel space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Rappels d'évènements</p>
                <h3 className="text-base font-semibold text-foreground">
                  Ne manquez aucun rendez-vous important
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span>Rappels intelligents activés</span>
              </div>
            </div>
            <div className="space-y-3">
              {upcomingReminders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4 text-xs text-muted-foreground">
                  Ajoutez des tâches avec rappel pour voir les prochaines notifications.
                </div>
              ) : (
                upcomingReminders.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Rappel {task.reminder} · Échéance {task.dueDate || "à définir"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {task.channelEmail && (
                        <Badge variant="outline" className="text-[10px]">
                          Email
                        </Badge>
                      )}
                      {task.channelPush && (
                        <Badge variant="outline" className="text-[10px]">
                          Push
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="fx-panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Créer une tâche</p>
                <h3 className="text-base font-semibold text-foreground">
                  Ordonnez vos actions d'investissement
                </h3>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleTaskSubmit}>
              <div className="space-y-2">
                <Label className="text-xs">Titre de la tâche</Label>
                <Input
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  placeholder="Ex: Vérifier la performance du portefeuille"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Date d'échéance</Label>
                  <Input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Rappel</Label>
                  <select
                    className={inputClasses}
                    value={taskForm.reminder}
                    onChange={(event) => setTaskForm({ ...taskForm, reminder: event.target.value })}
                  >
                    {reminderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes complémentaires</Label>
                <Textarea
                  value={taskForm.notes}
                  onChange={(event) => setTaskForm({ ...taskForm, notes: event.target.value })}
                  placeholder="Décrivez le contexte ou les informations clés à surveiller."
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={taskForm.channelEmail}
                    onCheckedChange={(checked) =>
                      setTaskForm({ ...taskForm, channelEmail: checked })
                    }
                    id="task-email"
                  />
                  <Label htmlFor="task-email" className="text-xs">
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={taskForm.channelPush}
                    onCheckedChange={(checked) =>
                      setTaskForm({ ...taskForm, channelPush: checked })
                    }
                    id="task-push"
                  />
                  <Label htmlFor="task-push" className="text-xs">
                    Notification push
                  </Label>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Ajouter la tâche
              </Button>
            </form>
            <div className="mt-4 space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3",
                    task.completed && "opacity-70"
                  )}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    aria-label={`Marquer ${task.title} comme terminé`}
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {task.reminder}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Échéance {task.dueDate || "à définir"} · {task.notes || "Aucune note"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      {task.channelEmail && <span>Email</span>}
                      {task.channelPush && <span>Push</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fx-panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Créer une alerte</p>
                <h3 className="text-base font-semibold text-foreground">
                  Surveillez vos seuils critiques
                </h3>
              </div>
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleAlertSubmit}>
              <div className="space-y-2">
                <Label className="text-xs">Nom de l'alerte</Label>
                <Input
                  value={alertForm.title}
                  onChange={(event) => setAlertForm({ ...alertForm, title: event.target.value })}
                  placeholder="Ex: Seuil de liquidité"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Métrique</Label>
                  <Input
                    value={alertForm.metric}
                    onChange={(event) => setAlertForm({ ...alertForm, metric: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Seuil</Label>
                  <Input
                    value={alertForm.threshold}
                    onChange={(event) => setAlertForm({ ...alertForm, threshold: event.target.value })}
                    placeholder="Ex: < 10 000 €"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Cadence</Label>
                  <select
                    className={inputClasses}
                    value={alertForm.cadence}
                    onChange={(event) => setAlertForm({ ...alertForm, cadence: event.target.value })}
                  >
                    {cadenceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Canaux</Label>
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={alertForm.channelEmail}
                        onCheckedChange={(checked) =>
                          setAlertForm({ ...alertForm, channelEmail: checked })
                        }
                        id="alert-email"
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={alertForm.channelPush}
                        onCheckedChange={(checked) =>
                          setAlertForm({ ...alertForm, channelPush: checked })
                        }
                        id="alert-push"
                      />
                      Push
                    </label>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Ajouter l'alerte
              </Button>
            </form>
            <div className="mt-4 space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-border/60 bg-background/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {alert.cadence}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {alert.metric} · Seuil {alert.threshold}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    {alert.channelEmail && <span>Email</span>}
                    {alert.channelPush && <span>Push</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
