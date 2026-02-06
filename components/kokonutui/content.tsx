"use client"

import { Target, CreditCard, Wallet, Bot, TrendingUp, PieChart, LineChart } from "lucide-react"
import List01 from "./list-01"
import List02 from "./list-02"
import List03 from "./list-03"
import List04 from "./list-04"
import AIAdvisor from "./ai-advisor"
import PerformanceAllocation from "./performance-allocation"
import NetWorth from "./net-worth"
import { PortfolioProvider } from "@/lib/portfolio-context"

export default function Content() {
  return (
    <PortfolioProvider>
      <div className="space-y-8">
        <section id="ai-advisor" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              AI Investment Advisor
            </h2>
          </div>
          <AIAdvisor className="w-full" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section id="accounts" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Accounts</h2>
            </div>
            <List01 className="h-full w-full" />
          </section>

          <section id="transactions" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Recent Transactions
              </h2>
            </div>
            <List02 className="h-full w-full" />
          </section>

          <section id="performance-allocation" className="space-y-3 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
                <PieChart className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Performance & Allocation
              </h2>
            </div>
            <PerformanceAllocation className="h-full w-full" />
          </section>
        </div>

        <section id="stock-actions" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Stock Market Actions
            </h2>
          </div>
          <List04 className="h-full w-full" />
        </section>

        <section id="net-worth" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
              <LineChart className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Net Worth
            </h2>
          </div>
          <NetWorth className="h-full w-full" />
        </section>

        <section id="goals" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Financial Goals
            </h2>
          </div>
          <List03 />
        </section>
      </div>
    </PortfolioProvider>
  )
}
