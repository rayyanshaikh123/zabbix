"use client"
import { useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import useSWR from "swr"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Dataset = {
  [country: string]: {
    [city: string]: string[]
  }
}

const fallbackLocations: Dataset = {
  india: {
    mumbai: ["jogeshwari-office", "churchgate-office"],
    delhi: ["cp-office"],
    pune: ["magarpatta-office"],
  },
  japan: {
    tokyo: ["shinjuku-office"],
  },
  toronto: {
    toronto: ["downtown-office"],
  },
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LocationSelector({
  initial,
  onNavigate = true,
}: {
  initial?: { country?: string; city?: string; office?: string }
  onNavigate?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data } = useSWR<Dataset>("/api/locations", fetcher, { fallbackData: fallbackLocations })

  const countries = useMemo(() => Object.keys(data || {}), [data])
  const cities = useMemo(
    () => (initial?.country ? Object.keys(data?.[initial.country] || {}) : []),
    [data, initial?.country],
  )
  const offices = useMemo(
    () => (initial?.country && initial?.city ? data?.[initial.country]?.[initial?.city] || [] : []),
    [data, initial?.country, initial?.city],
  )

  function pushRoute(next: { country?: string; city?: string; office?: string }) {
    if (!onNavigate) return
    const country = next.country ?? initial?.country
    const city = next.city ?? initial?.city
    const office = next.office ?? initial?.office

    if (country && city && office) {
      router.push(`/locations/${country}/${city}/${office}`)
    } else if (country && city) {
      router.push(`/locations/${country}/${city}`)
    } else if (country) {
      router.push(`/locations/${country}`)
    } else {
      if (!pathname.startsWith("/locations")) router.push("/locations")
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="grid gap-2">
        <Label htmlFor="country">Country</Label>
        <Select
          value={initial?.country}
          onValueChange={(v) => pushRoute({ country: v, city: undefined, office: undefined })}
        >
          <SelectTrigger id="country" aria-label="Select country">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="city">City</Label>
        <Select
          value={initial?.city}
          onValueChange={(v) => pushRoute({ city: v, office: undefined })}
          disabled={!initial?.country}
        >
          <SelectTrigger id="city" aria-label="Select city">
            <SelectValue placeholder="Select a city" />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="office">Office</Label>
        <Select
          value={initial?.office}
          onValueChange={(v) => pushRoute({ office: v })}
          disabled={!initial?.country || !initial?.city}
        >
          <SelectTrigger id="office" aria-label="Select office">
            <SelectValue placeholder="Select an office" />
          </SelectTrigger>
          <SelectContent>
            {offices.map((o) => (
              <SelectItem key={o} value={o}>
                {o.replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
