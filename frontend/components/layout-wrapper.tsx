"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  const isAuthPage = pathname.startsWith('/auth')

  return (
    <div className="min-h-dvh md:flex md:flex-row bg-background">
      {/* Sidebar - only show if not on auth pages */}
      {!isAuthPage && (
        <div className="md:w-64 md:shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Main content */}
      <div className={isAuthPage ? "flex-1" : "flex-1"}>
        {!isAuthPage && (
          <header className="hidden md:flex sticky top-0 z-40 h-14 items-center justify-between border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="text-sm font-semibold text-balance">Network Health Dashboard</h1>
          </header>
        )}
        <main className={isAuthPage ? "" : "p-4 md:p-6"}>
          {children}
        </main>
      </div>
    </div>
  )
}
