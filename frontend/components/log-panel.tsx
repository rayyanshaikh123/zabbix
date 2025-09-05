"use client"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Log = {
  id: string
  time: string // ISO
  level: "info" | "warn" | "error"
  message: string
  suggestion?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LogPanel() {
  const { data } = useSWR<Log[]>("/api/logs", fetcher, {
    fallbackData: [
      { id: "1", time: new Date().toISOString(), level: "info", message: "Agent started" },
      {
        id: "2",
        time: new Date().toISOString(),
        level: "warn",
        message: "High CPU on router-3",
        suggestion: "Consider restarting interfaces Gi0/2 & Gi0/3",
      },
      {
        id: "3",
        time: new Date().toISOString(),
        level: "error",
        message: "Switch-7 unreachable",
        suggestion: "Ping test failed. Check uplink.",
      },
    ],
  })

  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error">("all")
  const filtered = useMemo(
    () => (filter === "all" ? data : data?.filter((l) => l.level === filter)) ?? [],
    [data, filter],
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-balance">Agent Logs & Troubleshooting</CardTitle>
        <div className="flex gap-2">
          {(["all", "info", "warn", "error"] as const).map((k) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] overflow-auto rounded-md border">
          <ul className="divide-y">
            {filtered.map((l) => (
              <li key={l.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{new Date(l.time).toLocaleString()}</div>
                  <Badge variant={l.level === "error" ? "destructive" : l.level === "warn" ? "secondary" : "outline"}>
                    {l.level.toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-1 text-sm">{l.message}</div>
                {l.suggestion ? (
                  <div className="mt-1 text-xs text-muted-foreground">Suggestion: {l.suggestion}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
