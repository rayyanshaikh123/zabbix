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
    <div className="min-h-dvh md:flex md:flex-row relative">
      {/* Full-screen gradient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "var(--bg-gradient, #03070d)" }}
      />
      {/* Sidebar - only show if not on auth pages */}
      {!isAuthPage && (
        <div className="md:w-64 md:shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Main content */}
      <div className={isAuthPage ? "flex-1" : "flex-1"}>
        <main className={isAuthPage ? "" : "p-4 md:p-6"}>
          {children}
        </main>
      </div>
    </div>
  )
}
