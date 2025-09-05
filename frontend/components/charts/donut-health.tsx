"use client"

import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type Slice = { name: "Healthy" | "Warning" | "Critical"; value: number }
export type DonutHealthProps = {
  title: string
  data: Slice[]
  onClick?: () => void
}

const colorBy = {
  Healthy: "hsl(var(--ok))",
  Warning: "hsl(var(--warn))",
  Critical: "hsl(var(--crit))",
} as const

export function DonutHealth({ title, data, onClick }: DonutHealthProps) {
  return (
    <Card className="card card-hover cursor-pointer" onClick={onClick} role="button" aria-label={`${title} health`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer
          className="h-[220px]"
          config={{
            healthy: { label: "Healthy", color: "hsl(var(--ok))" },
            warning: { label: "Warning", color: "hsl(var(--warn))" },
            critical: { label: "Critical", color: "hsl(var(--crit))" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={8}
              >
                {data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={colorBy[entry.name]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorBy[d.name] }} aria-hidden />
              <span>
                {d.name} <span className="font-medium">{Math.round(d.value)}%</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
