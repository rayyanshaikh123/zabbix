"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export type AlertsPoint = { label: string; warning: number; critical: number }
export function AlertsStacked({ title, data }: { title: string; data: AlertsPoint[] }) {
  return (
    <Card className="card card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer
          className="h-[220px]"
          config={{
            warning: { label: "Warning", color: "hsl(var(--warn))" },
            critical: { label: "Critical", color: "hsl(var(--crit))" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} stackOffset="sign" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="warning" stackId="a" fill="var(--color-warning, hsl(var(--warn)))" />
              <Bar dataKey="critical" stackId="a" fill="var(--color-critical, hsl(var(--crit)))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
