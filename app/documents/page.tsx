import Layout from "@/components/kokonutui/layout"
import { DOCUMENTS, type DocumentCategory } from "@/lib/portfolio-data"
import { FileText, FileSpreadsheet, ShieldCheck } from "lucide-react"

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contracts: "Contrats",
  statements: "Relevés",
  certificates: "Attestations",
  tax: "Export fiscal annuel / IFI",
}

const CATEGORY_ICONS: Record<DocumentCategory, typeof FileText> = {
  contracts: FileText,
  statements: FileText,
  certificates: ShieldCheck,
  tax: FileSpreadsheet,
}

export default function DocumentsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Documents
            </p>
            <h1 className="text-2xl font-semibold text-foreground">Centre documentaire</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Retrouvez vos contrats, relevés, attestations et exports fiscaux centralisés au
              même endroit.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            Dernière mise à jour : <span className="font-medium text-foreground">05 avr. 2024</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
            const typedCategory = category as DocumentCategory
            const items = DOCUMENTS.filter((doc) => doc.category === typedCategory)
            const Icon = CATEGORY_ICONS[typedCategory]

            return (
              <div key={category} className="fx-panel">
                <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {items.length} document{items.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border/60">
                  {items.map((doc) => (
                    <div key={doc.id} className="flex items-start justify-between gap-4 px-5 py-4">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{doc.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{doc.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {doc.period && (
                            <span className="rounded-full border border-border/60 px-2 py-0.5">
                              {doc.period}
                            </span>
                          )}
                          <span className="rounded-full border border-border/60 px-2 py-0.5">
                            {doc.format}
                          </span>
                          <span className="rounded-full border border-border/60 px-2 py-0.5">
                            {doc.size}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Mis à jour le <span className="font-medium text-foreground">{doc.updatedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
