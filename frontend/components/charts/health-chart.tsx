"use client"
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type Segment = { name: "Healthy" | "Warning" | "Critical"; value: number }
export type HealthChartData = Segment[]

export function HealthChart({
  title,
  data,
  className,
}: {
  title?: string
  data: HealthChartData
  className?: string
}) {
  // Color system: primary blue + accents green/red + neutrals
  const colors = {
    Healthy: "hsl(142 72% 45%)", // green-500
    Warning: "hsl(199 89% 48%)", // sky-500 (primary)
    Critical: "hsl(346 77% 49%)", // rose-500
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-balance text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-2">
        <ChartContainer
          className="h-[180px]"
          config={{
            Healthy: { label: "Healthy", color: colors.Healthy },
            Warning: { label: "Warning", color: colors.Warning },
            Critical: { label: "Critical", color: colors.Critical },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                stroke="transparent"
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={colors[entry.name]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {data.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded"
                  style={{ backgroundColor: colors[s.name] }}
                  aria-hidden
                />
                <span className="text-muted-foreground">{s.name}</span>
                <span className="ml-auto font-medium">{s.value}%</span>
              </div>
            ))}
          </div>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
