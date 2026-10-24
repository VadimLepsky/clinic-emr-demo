'use client'

import useSWR from 'swr'
import { getServicesByIds } from '@/lib/data'
import type { DocumentValues, TemplateSchema } from '@/lib/types'
import { getSelectedServices } from '@/components/template-form/utils'

export function useSelectedServices(
  schema: TemplateSchema | undefined,
  values: DocumentValues | undefined,
  extraIds: string[] = [],
) {
  // Only catalog services are fetched; one outside the clinic is just its name.
  const selectedIds =
    schema && values ? getSelectedServices(schema, values).flatMap((s) => (s.serviceId ? [s.serviceId] : [])) : []
  const ids = [...new Set([...selectedIds, ...extraIds])].sort()
  const { data } = useSWR(ids.length ? ['services-by-ids', ...ids] : null, ([, ...list]) => getServicesByIds(list), {
    keepPreviousData: true,
  })
  return data ?? []
}
