"use client"

import { Target, CreditCard, Wallet, Bot, TrendingUp } from "lucide-react"
import List01 from "./list-01"
import List02 from "./list-02"
import List03 from "./list-03"
import List04 from "./list-04"
import AIAdvisor from "./ai-advisor"
import { PortfolioProvider } from "@/lib/portfolio-context"

export default function Content() {
  return (
    <PortfolioProvider>
      <div className="space-y-4">
        {/* AI Financial Advisor */}
        <section
          id="ai-advisor"
          className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23] scroll-mt-20"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            AI Investment Advisor
          </h2>
          <AIAdvisor />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            id="accounts"
            className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23] scroll-mt-20"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2 ">
              <Wallet className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
              Accounts
            </h2>
            <div className="flex-1">
              <List01 className="h-full" />
            </div>
          </section>
          <section
            id="transactions"
            className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23] scroll-mt-20"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
              Recent Transactions
            </h2>
            <div className="flex-1">
              <List02 className="h-full" />
            </div>
          </section>
        </div>

        <section
          id="stock-actions"
          className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23] scroll-mt-20"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Stock Market Actions
          </h2>
          <div className="flex-1">
            <List04 className="h-full" />
          </div>
        </section>

        <section
          id="goals"
          className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col items-start justify-start border border-gray-200 dark:border-[#1F1F23] scroll-mt-20"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Financial Goals
          </h2>
          <List03 />
        </section>
      </div>
    </PortfolioProvider>
  )
}
