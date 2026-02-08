import Layout from "@/components/kokonutui/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Paramètres</h1>
          <p className="text-sm text-muted-foreground">
            Configurez les paramètres essentiels pour sécuriser, personnaliser et synchroniser votre
            tableau de bord.
          </p>
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
                <Input id="settings-name" placeholder="Aïcha Diallo" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-email">
                  Email
                </label>
                <Input id="settings-email" type="email" placeholder="aicha@investai.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-phone">
                  Téléphone
                </label>
                <Input id="settings-phone" type="tel" placeholder="+33 6 12 34 56 78" />
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
                <Input id="settings-password" type="password" placeholder="••••••••" />
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
                  defaultChecked
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  defaultChecked
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  defaultValue="fr"
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
                  defaultValue="eur"
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
                  defaultValue="paris"
                >
                  <option value="paris">Europe/Paris</option>
                  <option value="new-york">America/New_York</option>
                  <option value="singapore">Asia/Singapore</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Confidentialité &amp; synchronisation</CardTitle>
              <CardDescription>Gérez les partages et la synchronisation des données.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Synchronisation bancaire</p>
                  <p className="text-xs text-muted-foreground">
                    Mettre à jour automatiquement les comptes et transactions.
                  </p>
                </div>
                <input
                  aria-label="Activer la synchronisation bancaire"
                  defaultChecked
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                />
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
