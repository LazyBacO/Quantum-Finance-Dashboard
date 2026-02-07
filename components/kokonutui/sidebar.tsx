"use client"

import React from "react"

import {
  BarChart2,
  Receipt,
  CreditCard,
  Wallet,
  Bot,
  Settings,
  HelpCircle,
  Menu,
  TrendingUp,
  PiggyBank,
  Target,
  Home,
  Plug,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
  }: {
    href: string
    icon: any
    children: React.ReactNode
  }) {
    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className="flex items-center px-3 py-2 text-sm rounded-md transition-colors text-foreground/70 hover:text-foreground hover:bg-accent/60"
      >
        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {children}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-xl bg-background/60 backdrop-blur-xl border border-border/60 shadow-sm"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-foreground/70" />
      </button>
      <nav
        className={`
                fixed inset-y-0 left-0 z-[70] w-64 transform transition-transform duration-200 ease-in-out
                lg:translate-x-0 lg:static lg:w-64
                bg-background/55 backdrop-blur-xl border-r border-border/60
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 px-6 flex items-center border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-semibold tracking-tight fx-brand">InvestAI</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </div>
                <div className="space-y-1">
                  <NavItem href="/dashboard" icon={Home}>
                    Dashboard
                  </NavItem>
                  <NavItem href="/dashboard#ai-advisor" icon={Bot}>
                    AI Advisor
                  </NavItem>
                  <NavItem href="/dashboard#accounts" icon={BarChart2}>
                    Accounts Overview
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Portfolio
                </div>
                <div className="space-y-1">
                  <NavItem href="/dashboard#accounts" icon={Wallet}>
                    Accounts
                  </NavItem>
                  <NavItem href="/dashboard#stock-actions" icon={TrendingUp}>
                    Stock Actions
                  </NavItem>
                  <NavItem href="/dashboard#transactions" icon={Receipt}>
                    Transactions
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Planning
                </div>
                <div className="space-y-1">
                  <NavItem href="/dashboard#goals" icon={Target}>
                    Goals
                  </NavItem>
                  <NavItem href="/dashboard#goals" icon={PiggyBank}>
                    Savings
                  </NavItem>
                  <NavItem href="/dashboard#transactions" icon={CreditCard}>
                    Budgets
                  </NavItem>
                  <NavItem href="/dashboard#integrations" icon={Plug}>
                    Intégrations
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-border/60">
            <div className="space-y-1">
              <NavItem href="#" icon={Settings}>
                Settings
              </NavItem>
              <NavItem href="#" icon={HelpCircle}>
                Help
              </NavItem>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
