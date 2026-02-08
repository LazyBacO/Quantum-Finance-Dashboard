import AlertsNotifications from "@/components/kokonutui/alerts-notifications"
import Layout from "@/components/kokonutui/layout"
import { PortfolioProvider } from "@/lib/portfolio-context"
import { Bell } from "lucide-react"

export default function AlertsNotificationsPage() {
  return (
    <Layout>
      <PortfolioProvider>
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Alertes &amp; notifications
              </h1>
              <p className="text-xs text-muted-foreground">
                Centralisez vos rappels, vos tâches et vos alertes de marché.
              </p>
            </div>
          </div>
          <AlertsNotifications className="w-full" />
        </section>
      </PortfolioProvider>
    </Layout>
  )
}
