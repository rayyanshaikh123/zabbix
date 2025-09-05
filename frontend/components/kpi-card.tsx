"use client"

import { Card, CardContent } from "@/components/ui/card"

export function KpiCard({
  label,
  value,
  delta,
  intent = "neutral",
}: {
  label: string
  value: string
  delta?: string
  intent?: "neutral" | "good" | "warn" | "bad"
}) {
  const color =
    intent === "good"
      ? "text-[hsl(var(--ok))]"
      : intent === "warn"
        ? "text-[hsl(var(--warn))]"
        : intent === "bad"
          ? "text-[hsl(var(--crit))]"
          : "text-slate-600"

  return (
    <Card className="card">
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
        {delta && <div className={`mt-1 text-xs ${color}`}>{delta}</div>}
      </CardContent>
    </Card>
  )
}
