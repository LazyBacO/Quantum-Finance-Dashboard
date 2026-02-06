import type { ReactNode } from "react"
import Sidebar from "./sidebar"
import TopNav from "./top-nav"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 fx-glow" />
        <div className="absolute inset-0 fx-grid" />
      </div>

      <Sidebar />
      <div className="flex w-full flex-1 flex-col">
        <header className="h-16 border-b border-border/60 bg-background/50 backdrop-blur-xl">
          <TopNav />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}

