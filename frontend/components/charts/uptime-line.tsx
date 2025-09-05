"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export type UptimePoint = { t: string; uptime: number }
export function UptimeLine({ title, data }: { title: string; data: UptimePoint[] }) {
  return (
    <Card className="card card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer
          className="h-[220px]"
          config={{
            uptime: { label: "Uptime %", color: "hsl(217 91% 60%)" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" tickLine={false} axisLine={false} />
              <YAxis domain={[90, 100]} tickFormatter={(v) => `${v}%`} width={36} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="uptime"
                stroke="var(--color-uptime, hsl(217 91% 60%))"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
