"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type HealthSlice = { name: "Healthy" | "Warning" | "Critical"; value: number }
type SeriesPoint = { t: string; value: number }

type HealthProps = {
  title: string
  kind: "health"
  data: HealthSlice[]
}

type SeriesProps = {
  title: string
  kind: "series"
  data: SeriesPoint[]
  yLabel?: string
  yDomain?: [number, number]
}

export type ChartSwitcherProps = HealthProps | SeriesProps

const healthColors: Record<HealthSlice["name"], string> = {
  Healthy: "hsl(var(--ok))",
  Warning: "hsl(var(--warn))",
  Critical: "hsl(var(--crit))",
}

export function ChartSwitcher(props: ChartSwitcherProps) {
  const isHealth = props.kind === "health"
  const [view, setView] = React.useState(isHealth ? ("donut" as "donut" | "bar") : ("line" as "line" | "area" | "bar"))

  return (
    <Card className="card card-hover">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>

        {/* View selector */}
        <div className="w-40">
          <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
            <SelectTrigger aria-label="Change chart type" className="h-8">
              <SelectValue placeholder="Chart type" />
            </SelectTrigger>
            <SelectContent>
              {isHealth ? (
                <>
                  <SelectItem value="donut">Donut</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isHealth ? (
          <ChartContainer
            className="h-[240px]"
            config={{
              healthy: { label: "Healthy", color: "hsl(var(--ok))" },
              warning: { label: "Warning", color: "hsl(var(--warn))" },
              critical: { label: "Critical", color: "hsl(var(--crit))" },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {view === "donut" ? (
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={props.data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                    strokeWidth={8}
                  >
                    {props.data.map((s, i) => (
                      <Cell key={i} fill={healthColors[s.name]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <BarChart data={props.data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value">
                    {props.data.map((s, i) => (
                      <Cell key={i} fill={healthColors[s.name]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <ChartContainer
            className="h-[240px]"
            config={{
              value: { label: props.yLabel ?? "Value", color: "hsl(217 91% 60%)" }, // primary blue
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {view === "line" ? (
                <LineChart data={props.data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} />
                  <YAxis domain={props.yDomain} tickFormatter={(v) => (props.yDomain ? `${v}%` : `${v}`)} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-line, hsl(217 91% 60%))"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              ) : view === "area" ? (
                <AreaChart data={props.data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} />
                  <YAxis domain={props.yDomain} tickFormatter={(v) => (props.yDomain ? `${v}%` : `${v}`)} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60% / 0.25)" />
                </AreaChart>
              ) : (
                <BarChart data={props.data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} />
                  <YAxis domain={props.yDomain} tickFormatter={(v) => (props.yDomain ? `${v}%` : `${v}`)} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(217 91% 60%)" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
