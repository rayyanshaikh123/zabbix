"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, LogOut, User, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

type NavItem = { label: string; href: string; adminOnly?: boolean }

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Location", href: "/location" },
  { label: "Devices", href: "/devices" },
  { label: "Admin", href: "/admin", adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data: session, status } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

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
      <aside className="text-sidebar-foreground md:w-64 md:flex md:flex-col md:shrink-0 md:sticky md:top-0 md:h-dvh">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40"></div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="text-sidebar-foreground md:w-64 md:flex md:flex-col md:shrink-0 md:sticky md:top-0 md:h-dvh">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 glass-panel border border-white/10 rounded-none">
        <span className="font-semibold">Network Dashboard</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="outline" size="icon" aria-label="Toggle navigation menu" onClick={() => setOpen((o) => !o)}>
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn("md:hidden", open ? "block" : "hidden")}>
        <nav className="px-2 py-2" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-none text-sm border-l-2 transition-colors bg-white/5 border border-white/10 glass-hover",
                isActive(item.href)
                  ? "bg-white/10 text-slate-100 border-white/30"
                  : "text-slate-300 hover:text-slate-100 hover:bg-white/10 border-white/10",
              )}
              onClick={() => setOpen(false)}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isActive(item.href) ? "#60a5fa" : "rgba(255,255,255,0.2)" }}
                aria-hidden="true"
              />
              <span className="text-pretty">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col h-full glass-panel  border border-white/10 rounded-none" style={{ ['--glass-radius' as any]: '0px' }}>
        <div className="h-14 border-b border-white/10 px-4 flex items-center gap-2">
          <span className="font-semibold">Network Dashboard</span>
          <div className="ml-auto" />
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            className="btn-glass rounded-none"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
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
                      "flex items-center gap-2 px-3 py-2 rounded-none text-sm transition-colors border-l-2 bg-white/5 border border-white/10 glass-hover",
                      isActive(item.href)
                        ? "bg-white/10 text-slate-100 border-white/30"
                        : "text-slate-300 hover:text-slate-100 hover:bg-white/10 border-white/10",
                    )}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isActive(item.href) ? "#60a5fa" : "rgba(255,255,255,0.2)" }}
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
          <div className="border-t border-white/10 p-3">
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
              className="w-full justify-start gap-2 btn-glass rounded-none"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}

       
      </div>
    </aside>
  )
}
