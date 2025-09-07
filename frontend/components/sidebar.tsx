"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, LogOut, User } from "lucide-react"

type NavItem = { label: string; href: string; adminOnly?: boolean }

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Locations", href: "/locations" },
  { label: "Devices", href: "/devices" },
  { label: "Admin", href: "/admin", adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data: session, status } = useSession()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" })
  }

  // Show loading state
  if (status === "loading") {
    return (
      <aside className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border md:w-64 md:flex md:flex-col md:shrink-0 md:sticky md:top-0 md:h-dvh">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sidebar-primary"></div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border md:w-64 md:flex md:flex-col md:shrink-0 md:sticky md:top-0 md:h-dvh">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        <span className="font-semibold">Network Dashboard</span>
        <Button variant="outline" size="icon" aria-label="Toggle navigation menu" onClick={() => setOpen((o) => !o)}>
          <Menu className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Mobile menu */}
      <div className={cn("md:hidden", open ? "block" : "hidden")}>
        <nav className="px-2 py-2" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded text-sm border-l-2 transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent text-sidebar-primary border-sidebar-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border-transparent",
              )}
              onClick={() => setOpen(false)}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isActive(item.href) ? "var(--sidebar-primary)" : "var(--border)" }}
                aria-hidden="true"
              />
              <span className="text-pretty">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col h-full">
        <div className="h-14 border-b border-sidebar-border px-4 flex items-center">
          <span className="font-semibold">Network Dashboard</span>
        </div>

        <nav className="flex-1 p-2" aria-label="Primary">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              // Hide admin-only items if user is not admin
              if (item.adminOnly && session?.user?.role !== 'admin') {
                return null
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors border-l-2",
                      isActive(item.href)
                        ? "bg-sidebar-accent text-sidebar-primary border-sidebar-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border-transparent",
                    )}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isActive(item.href) ? "var(--sidebar-primary)" : "var(--border)" }}
                      aria-hidden="true"
                    />
                    <span className="text-pretty">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        {session?.user && (
          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}

        <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
          <p className="leading-5">
            Colors: primary for active, muted for idle. Use green for healthy, amber for warning, red for critical.
          </p>
        </div>
      </div>
    </aside>
  )
}
