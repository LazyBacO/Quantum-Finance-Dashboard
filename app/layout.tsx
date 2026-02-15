import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { ObservabilityClient } from "@/components/observability-client"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opennova-finance.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OpenNova Finance | Dashboard intelligent",
    template: "%s | OpenNova Finance",
  },
  description:
    "OpenNova Finance centralise portefeuille, budget, alertes et pilotage IA pour vos décisions financières.",
  applicationName: "OpenNova Finance",
  keywords: [
    "OpenNova Finance",
    "dashboard financier",
    "budget mensuel",
    "portefeuille",
    "agent IA",
    "alertes financières",
  ],
  authors: [{ name: "OpenNova Finance" }],
  creator: "OpenNova Finance",
  publisher: "OpenNova Finance",
  alternates: {
    canonical: "/dashboard",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    title: "OpenNova Finance | Dashboard intelligent",
    description:
      "Pilotez comptes, transactions, objectifs, alertes et scénarios via un cockpit financier moderne.",
    siteName: "OpenNova Finance",
    images: [
      {
        url: "/opennova-og.svg",
        width: 1200,
        height: 630,
        alt: "OpenNova Finance dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenNova Finance",
    description:
      "Dashboard financier avec IA, synchronisation multi-appareils et modules de planification.",
    images: ["/opennova-og.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ObservabilityClient />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
