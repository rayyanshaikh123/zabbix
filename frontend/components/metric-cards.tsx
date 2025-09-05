"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

type MetricCardProps = {
  title: string
  value: string | number
  delta?: string
  data?: { x: string | number; y: number }[]
  className?: string
}

export function MetricCard({ title, value, delta, data, className }: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          {delta ? <div className="text-xs text-muted-foreground mt-1">{delta}</div> : null}
        </div>
        {data && data.length ? (
          <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <Line type="monotone" dataKey="y" dot={false} stroke="hsl(199 89% 48%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
