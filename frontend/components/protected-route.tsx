"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: string
  fallback?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requireRole,
  fallback
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/auth/signin")
      return
    }

    if (requireRole && session.user?.role !== requireRole) {
      router.push("/dashboard") // Redirect to dashboard if wrong role
      return
    }
  }, [session, status, router, requireRole])

  // Show loading state
  if (status === "loading") {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Show unauthorized state
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Access Denied</p>
          <p className="text-muted-foreground">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  // Check role requirement
  if (requireRole && session.user?.role !== requireRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Access Denied</p>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
