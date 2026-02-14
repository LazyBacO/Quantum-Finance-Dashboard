"use client"

import { useCallback, useEffect, useState } from "react"
import Layout from "@/components/kokonutui/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createSyncKey } from "@/lib/random-id"
import { defaultSettings, loadSettings, saveSettings, type SettingsData } from "@/lib/settings-store"

type SettingsStatus = "idle" | "loading" | "saving" | "saved" | "error"
type MarketDataProviderUnderTest = "massive" | "twelvedata"
type MarketDataConnectionStatus = "idle" | "testing" | "success" | "error"

type MarketDataConnectionState = {
  status: MarketDataConnectionStatus
  message: string
}

const statusCopy: Record<SettingsStatus, string> = {
  idle: "",
  loading: "Chargement des paramètres...",
  saving: "Enregistrement en cours...",
  saved: "Paramètres enregistrés.",
  error: "Impossible d’enregistrer les paramètres.",
}

const defaultConnectionState: MarketDataConnectionState = {
  status: "idle",
  message: "",
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings)
  const [status, setStatus] = useState<SettingsStatus>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<
    Record<MarketDataProviderUnderTest, MarketDataConnectionState>
  >({
    massive: defaultConnectionState,
    twelvedata: defaultConnectionState,
  })

  useEffect(() => {
    let isMounted = true

    const fetchSettings = async () => {
      setStatus("loading")
      setErrorMessage(null)
      try {
        const stored = await loadSettings()
        if (isMounted) {
          setSettings(stored)
          setStatus("idle")
        }
      } catch {
        if (isMounted) {
          setStatus("error")
          setErrorMessage("Erreur lors du chargement des paramètres.")
        }
      }
    }

    fetchSettings()

    return () => {
      isMounted = false
    }
  }, [])

  const persistSettings = useCallback(async (nextSettings: SettingsData) => {
    setStatus("saving")
    setErrorMessage(null)

    try {
      await saveSettings(nextSettings)
      setStatus("saved")
      window.setTimeout(() => {
        setStatus((currentStatus) => (currentStatus === "saved" ? "idle" : currentStatus))
      }, 2000)
    } catch {
      setStatus("error")
      setErrorMessage("Une erreur est survenue lors de la sauvegarde.")
    }
  }, [])

  const updateSettings = useCallback(
    (updates: Partial<SettingsData>, shouldPersist = false) => {
      setSettings((current) => {
        const nextSettings = {
          ...current,
          ...updates,
          notifications: {
            ...current.notifications,
            ...updates.notifications,
          },
        }

        if (shouldPersist) {
          void persistSettings(nextSettings)
        }

        return nextSettings
      })
    },
    [persistSettings]
  )

  const handleSaveClick = useCallback(() => {
    void persistSettings(settings)
  }, [persistSettings, settings])

  const generateSyncKey = useCallback(() => {
    const generated = createSyncKey(32)
    updateSettings(
      {
        sync: {
          ...settings.sync,
          key: generated,
        },
      },
      true
    )
  }, [settings.sync, updateSettings])

  const resetConnectionState = useCallback((provider: MarketDataProviderUnderTest) => {
    setConnectionState((current) => ({
      ...current,
      [provider]: defaultConnectionState,
    }))
  }, [])

  const updateConnectionState = useCallback(
    (provider: MarketDataProviderUnderTest, next: MarketDataConnectionState) => {
      setConnectionState((current) => ({
        ...current,
        [provider]: next,
      }))
    },
    []
  )

  const testMarketDataConnection = useCallback(
    async (provider: MarketDataProviderUnderTest) => {
      updateConnectionState(provider, {
        status: "testing",
        message: "Test en cours...",
      })

      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-market-provider": provider,
      }

      const massiveApiKey = settings.marketData.massiveApiKey.trim()
      const twelveDataApiKey = settings.marketData.twelveDataApiKey.trim()

      if (massiveApiKey) {
        headers["x-massive-api-key"] = massiveApiKey
      }
      if (twelveDataApiKey) {
        headers["x-twelvedata-api-key"] = twelveDataApiKey
      }

      try {
        const response = await fetch("/api/market-data/test-connection", {
          method: "POST",
          headers,
          body: JSON.stringify({
            provider,
            symbol: "AAPL",
          }),
        })

        const payload = (await response.json()) as {
          success: boolean
          error?: string
          data?: {
            source?: string
            currentPrice?: number
            symbol?: string
          }
        }

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "Test de connexion indisponible.")
        }

        const sourceLabel = payload.data?.source ?? provider
        const symbol = payload.data?.symbol ?? "AAPL"
        const priceLabel =
          typeof payload.data?.currentPrice === "number" ? ` - ${payload.data.currentPrice.toFixed(2)} $` : ""

        updateConnectionState(provider, {
          status: "success",
          message: `Connexion OK (${sourceLabel}) sur ${symbol}${priceLabel}.`,
        })
      } catch (error) {
        updateConnectionState(provider, {
          status: "error",
          message: error instanceof Error ? error.message : "Echec de validation de la connexion API.",
        })
      }
    },
    [
      settings.marketData.massiveApiKey,
      settings.marketData.twelveDataApiKey,
      updateConnectionState,
    ]
  )

  const getConnectionStatusClassName = (provider: MarketDataProviderUnderTest) => {
    const state = connectionState[provider]
    if (state.status === "error") return "text-destructive"
    if (state.status === "success") return "text-green-600"
    return "text-muted-foreground"
  }

  const isLoading = status === "loading"

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
              Configurez les paramètres essentiels pour sécuriser, personnaliser et synchroniser votre
              tableau de bord.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleSaveClick} disabled={isLoading || status === "saving"}>
              Enregistrer
            </Button>
            <span
              role={status === "error" ? "alert" : "status"}
              className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {errorMessage ?? statusCopy[status]}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Identité et informations de contact principales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-name">
                  Nom complet
                </label>
                <Input
                  id="settings-name"
                  placeholder="Aïcha Diallo"
                  value={settings.name}
                  onChange={(event) => updateSettings({ name: event.target.value })}
                  onBlur={(event) => persistSettings({ ...settings, name: event.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-email">
                  Email
                </label>
                <Input
                  id="settings-email"
                  type="email"
                  placeholder="aicha@investai.com"
                  value={settings.email}
                  onChange={(event) => updateSettings({ email: event.target.value })}
                  onBlur={(event) => persistSettings({ ...settings, email: event.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-phone">
                  Téléphone
                </label>
                <Input
                  id="settings-phone"
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={settings.phone}
                  onChange={(event) => updateSettings({ phone: event.target.value })}
                  onBlur={(event) => persistSettings({ ...settings, phone: event.target.value })}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Contrôlez l’accès et les alertes de connexion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-password">
                  Mot de passe
                </label>
                <Input id="settings-password" type="password" placeholder="••••••••" disabled={isLoading} />
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Authentification à deux facteurs</p>
                  <p className="text-xs text-muted-foreground">
                    Protégez les connexions sensibles avec une validation supplémentaire.
                  </p>
                </div>
                <input
                  aria-label="Activer l’authentification à deux facteurs"
                  defaultChecked
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Alertes de connexion</p>
                  <p className="text-xs text-muted-foreground">
                    Recevez une notification lors d’une activité inhabituelle.
                  </p>
                </div>
                <input
                  aria-label="Activer les alertes de connexion"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choisissez comment recevoir les alertes clés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Résumé hebdomadaire</p>
                  <p className="text-xs text-muted-foreground">
                    Synthèse des performances et des mouvements majeurs.
                  </p>
                </div>
                <input
                  aria-label="Activer le résumé hebdomadaire"
                  checked={settings.notifications.weeklySummary}
                  onChange={(event) =>
                    updateSettings(
                      {
                        notifications: {
                          ...settings.notifications,
                          weeklySummary: event.target.checked,
                        },
                      },
                      true
                    )
                  }
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Alertes de seuil</p>
                  <p className="text-xs text-muted-foreground">
                    Notification instantanée si un actif dépasse un seuil défini.
                  </p>
                </div>
                <input
                  aria-label="Activer les alertes de seuil"
                  type="checkbox"
                  checked={settings.notifications.thresholdAlerts}
                  onChange={(event) =>
                    updateSettings(
                      {
                        notifications: {
                          ...settings.notifications,
                          thresholdAlerts: event.target.checked,
                        },
                      },
                      true
                    )
                  }
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Notifications mobiles</p>
                  <p className="text-xs text-muted-foreground">
                    Activez les notifications push pour les événements critiques.
                  </p>
                </div>
                <input
                  aria-label="Activer les notifications mobiles"
                  type="checkbox"
                  checked={settings.notifications.mobileNotifications}
                  onChange={(event) =>
                    updateSettings(
                      {
                        notifications: {
                          ...settings.notifications,
                          mobileNotifications: event.target.checked,
                        },
                      },
                      true
                    )
                  }
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Préférences de reporting</CardTitle>
              <CardDescription>Définissez la langue et les formats affichés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-language">
                  Langue
                </label>
                <select
                  id="settings-language"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={settings.language}
                  onChange={(event) =>
                    updateSettings(
                      { language: event.target.value as SettingsData["language"] },
                      true
                    )
                  }
                  disabled={isLoading}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-currency">
                  Devise principale
                </label>
                <select
                  id="settings-currency"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={settings.currency}
                  onChange={(event) =>
                    updateSettings(
                      { currency: event.target.value as SettingsData["currency"] },
                      true
                    )
                  }
                  disabled={isLoading}
                >
                  <option value="eur">EUR (€)</option>
                  <option value="usd">USD ($)</option>
                  <option value="gbp">GBP (£)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-timezone">
                  Fuseau horaire
                </label>
                <select
                  id="settings-timezone"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={settings.timezone}
                  onChange={(event) =>
                    updateSettings(
                      { timezone: event.target.value as SettingsData["timezone"] },
                      true
                    )
                  }
                  disabled={isLoading}
                >
                  <option value="paris">Europe/Paris</option>
                  <option value="new-york">America/New_York</option>
                  <option value="singapore">Asia/Singapore</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Données de marché</CardTitle>
              <CardDescription>
                Choisissez la source prioritaire et mettez à jour vos clés API Massive / TwelveData.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-market-provider">
                  Provider prioritaire
                </label>
                <select
                  id="settings-market-provider"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={settings.marketData.provider}
                  onChange={(event) =>
                    updateSettings(
                      {
                        marketData: {
                          ...settings.marketData,
                          provider: event.target.value as SettingsData["marketData"]["provider"],
                        },
                      },
                      true
                    )
                  }
                  disabled={isLoading}
                >
                  <option value="auto">Auto (TwelveData puis Massive)</option>
                  <option value="twelvedata">TwelveData en priorité</option>
                  <option value="massive">Massive en priorité</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-twelvedata-key">
                  Clé API TwelveData
                </label>
                <Input
                  id="settings-twelvedata-key"
                  type="password"
                  placeholder="td_..."
                  value={settings.marketData.twelveDataApiKey}
                  onChange={(event) => {
                    resetConnectionState("twelvedata")
                    updateSettings({
                      marketData: {
                        ...settings.marketData,
                        twelveDataApiKey: event.target.value,
                      },
                    })
                  }}
                  onBlur={(event) =>
                    updateSettings(
                      {
                        marketData: {
                          ...settings.marketData,
                          twelveDataApiKey: event.target.value,
                        },
                      },
                      true
                    )
                  }
                  disabled={isLoading}
                />
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void testMarketDataConnection("twelvedata")}
                    disabled={isLoading || connectionState.twelvedata.status === "testing"}
                  >
                    {connectionState.twelvedata.status === "testing"
                      ? "Test TwelveData..."
                      : "Tester la connexion API"}
                  </Button>
                  <span
                    role={connectionState.twelvedata.status === "error" ? "alert" : "status"}
                    className={`text-xs ${getConnectionStatusClassName("twelvedata")}`}
                  >
                    {connectionState.twelvedata.message}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-massive-key">
                  Clé API Massive (Polygon)
                </label>
                <Input
                  id="settings-massive-key"
                  type="password"
                  placeholder="your_massive_api_key"
                  value={settings.marketData.massiveApiKey}
                  onChange={(event) => {
                    resetConnectionState("massive")
                    updateSettings({
                      marketData: {
                        ...settings.marketData,
                        massiveApiKey: event.target.value,
                      },
                    })
                  }}
                  onBlur={(event) =>
                    updateSettings(
                      {
                        marketData: {
                          ...settings.marketData,
                          massiveApiKey: event.target.value,
                        },
                      },
                      true
                    )
                  }
                  disabled={isLoading}
                />
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void testMarketDataConnection("massive")}
                    disabled={isLoading || connectionState.massive.status === "testing"}
                  >
                    {connectionState.massive.status === "testing"
                      ? "Test Massive..."
                      : "Tester la connexion API"}
                  </Button>
                  <span
                    role={connectionState.massive.status === "error" ? "alert" : "status"}
                    className={`text-xs ${getConnectionStatusClassName("massive")}`}
                  >
                    {connectionState.massive.message}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Les clés sont stockées localement dans votre navigateur et peuvent être remplacées à tout moment.
              </p>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Confidentialité &amp; synchronisation</CardTitle>
              <CardDescription>
                Gérez la clé de synchronisation et le partage des données.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Synchronisation multi-appareils</p>
                  <p className="text-xs text-muted-foreground">
                    Active la synchronisation du portefeuille via la clé privée.
                  </p>
                </div>
                <input
                  aria-label="Activer la synchronisation multi-appareils"
                  type="checkbox"
                  checked={settings.sync.enabled}
                  onChange={(event) =>
                    updateSettings(
                      {
                        sync: {
                          ...settings.sync,
                          enabled: event.target.checked,
                        },
                      },
                      true
                    )
                  }
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </label>
              <label className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Partage avec l’agent IA</p>
                  <p className="text-xs text-muted-foreground">
                    Autoriser l’agent à analyser les données pour des conseils ciblés.
                  </p>
                </div>
                <input
                  aria-label="Autoriser le partage avec l’agent IA"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </label>
              <div className="rounded-lg border border-border/60 p-3 md:col-span-2 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Clé de synchronisation</p>
                    <p className="text-xs text-muted-foreground">
                      Utilisée comme jeton d’authentification pour récupérer vos données sur un autre
                      appareil.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateSyncKey}
                    disabled={isLoading || status === "saving"}
                  >
                    Générer une clé
                  </Button>
                </div>
                <Input
                  placeholder="Collez votre clé de synchronisation"
                  value={settings.sync.key}
                  onChange={(event) =>
                    updateSettings({
                      sync: {
                        ...settings.sync,
                        key: event.target.value,
                      },
                    })
                  }
                  onBlur={(event) =>
                    updateSettings(
                      {
                        sync: {
                          ...settings.sync,
                          key: event.target.value,
                        },
                      },
                      true
                    )
                  }
                  disabled={isLoading}
                />
                <label className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Synchronisation automatique</p>
                    <p className="text-xs text-muted-foreground">
                      Envoie les mises à jour du portefeuille vers le serveur à chaque changement.
                    </p>
                  </div>
                  <input
                    aria-label="Activer la synchronisation automatique"
                    type="checkbox"
                    checked={settings.sync.autoSync}
                    onChange={(event) =>
                      updateSettings(
                        {
                          sync: {
                            ...settings.sync,
                            autoSync: event.target.checked,
                          },
                        },
                        true
                      )
                    }
                    className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
