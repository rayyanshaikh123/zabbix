"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  className?: string
  fallbackPath?: string
}

export function BackButton({ className = "", fallbackPath = "/dashboard" }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleBack = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      router.back()
    } else {
      // Fallback to a logical parent path based on current route
      const pathSegments = pathname.split('/').filter(Boolean)

      if (pathSegments.length > 1) {
        // Remove the last segment to go up one level
        const parentPath = '/' + pathSegments.slice(0, -1).join('/')
        router.push(parentPath)
      } else {
        // If we're at root level, go to fallback
        router.push(fallbackPath)
      }
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleBack}
      className={`gap-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  )
}
