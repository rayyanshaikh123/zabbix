import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/session-provider"
import { LayoutWrapper } from "@/components/layout-wrapper"

export const metadata: Metadata = {
  title: "Network Monitoring Dashboard",
  description: "Real-time network device monitoring and alerts",
  generator: "Next.js",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <Suspense fallback={<div>Loading...</div>}>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </Suspense>
            <Analytics />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
