'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Service, ServiceCategory, ServicePackage } from '@/lib/types'

export type SearchServices = (query: string, category: ServiceCategory) => Promise<Service[]>

export type ServicesEditContext = {
  /** Every service the form knows about: resolved selections, package items and search results seen so far. */
  catalog: Map<string, Service>
  search: SearchServices
  packages: ServicePackage[]
}

const noSearch: SearchServices = async () => []

/** Keeps services returned by search so freshly selected chips and totals render without waiting for a refetch. */
export function useServicesEditContext(
  services: Service[],
  packages: ServicePackage[],
  onSearchServices: SearchServices | undefined,
): ServicesEditContext {
  const [seen, setSeen] = useState<Map<string, Service>>(() => new Map())
  const searchFn = onSearchServices ?? noSearch

  const search = useCallback<SearchServices>(
    async (query, category) => {
      const results = await searchFn(query, category)
      setSeen((prev) => {
        if (results.every((s) => prev.get(s.id) === s)) return prev
        const next = new Map(prev)
        results.forEach((s) => next.set(s.id, s))
        return next
      })
      return results
    },
    [searchFn],
  )

  const catalog = useMemo(() => {
    const map = new Map(seen)
    services.forEach((s) => map.set(s.id, s))
    return map
  }, [seen, services])

  return { catalog, search, packages }
}
