"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { Plus_Jakarta_Sans, Inter } from "next/font/google"

const titleFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["700", "800"] })
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid credentials")
      } else {
        // Refresh session and redirect
        await getSession()
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`${bodyFont.className} min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8`}
      style={{ background: "var(--bg-gradient, #0b1220)" }}
    >
      <Card className="w-full max-w-6xl glass-panel p-6 sm:p-8 md:p-10 lg:p-12">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className={`${titleFont.className} text-4xl md:text-5xl text-slate-100`}>Welcome back</CardTitle>
          <CardDescription className="text-slate-300 text-base md:text-lg">
            Sign in to access your network monitoring dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <div className="relative hidden lg:block overflow-hidden rounded-xl border border-white/10">
              <div className="absolute -top-24 -right-20 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/25 to-fuchsia-500/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-400/20 to-violet-400/20 blur-3xl" />
              <div className="relative p-8 lg:p-10">
                <h2 className={`${titleFont.className} text-2xl text-slate-100`}>Zabbix Monitor</h2>
                <p className="mt-3 text-slate-300 max-w-md">
                  Real-time visibility across offices, devices, and network health with a sleek glass UI.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="glass-panel glass-hover p-4">
                    <div className="badge badge--ok">Live</div>
                    <p className="mt-2 text-slate-200 text-sm">Metrics streaming</p>
                  </div>
                  <div className="glass-panel glass-hover p-4">
                    <div className="badge badge--warn">24h</div>
                    <p className="mt-2 text-slate-200 text-sm">Replay enabled</p>
                  </div>
                </div>
                <div className="mt-6 text-xs text-slate-300/80">
                  Tips: <span className="kbd">Tab</span> to navigate • <span className="kbd">Enter</span> to submit
                </div>
              </div>
            </div>

            <div>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-white/5 border-white/20 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[rgba(59,130,246,0.55)] focus-visible:ring-offset-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-white/5 border-white/20 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[rgba(59,130,246,0.55)] focus-visible:ring-offset-0"
                  />
                </div>

                <Button type="submit" className="w-full btn-glass btn-glass--primary text-base md:text-lg py-6" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-300">
                  Don't have an account?{" "}
                  <Link href="/auth/signup" className="font-medium accent-text hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
