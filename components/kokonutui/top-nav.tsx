"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { AlertTriangle, Bell, ChevronRight } from "lucide-react"
import Profile01 from "./profile-01"
import Link from "next/link"
import { ThemeToggle } from "../theme-toggle"
import { ALERTS } from "@/lib/portfolio-data"

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function TopNav() {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "InvestAI", href: "#" },
    { label: "Dashboard", href: "#" },
  ]
  const criticalAlerts = ALERTS.filter((alert) => alert.status === "critique").length

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-transparent h-full">
      <div className="font-medium text-sm hidden sm:flex items-center gap-1 truncate max-w-[300px]">
        {breadcrumbs.map((item, index) => (
          <div key={item.label} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
            {item.href ? (
              <Link
                href={item.href}
                className={`transition-colors ${index === 0 ? "fx-brand font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
        <button
          type="button"
          className="relative p-1.5 sm:p-2 hover:bg-accent/60 rounded-full transition-colors"
        >
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          {criticalAlerts > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
              {criticalAlerts}
            </span>
          )}
        </button>

        <button
          type="button"
          className="p-1.5 sm:p-2 hover:bg-accent/60 rounded-full transition-colors"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Image
              src="https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-01-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png"
              alt="User avatar"
              width={28}
              height={28}
              className="rounded-full ring-2 ring-border/70 hover:ring-primary/40 transition-colors sm:w-8 sm:h-8 cursor-pointer"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] sm:w-80 bg-background/80 border-border/60 backdrop-blur-xl rounded-xl shadow-xl"
          >
            <Profile01 avatar="https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-01-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
