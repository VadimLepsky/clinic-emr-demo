import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export type SummaryItem = { label: string; value: string; unit?: string }

/** loadingRows: how many items the skeleton stands in for, so the card keeps its height when the data arrives. */
export function SummaryCard({
  title,
  items,
  loadingRows = 3,
}: {
  title: string
  items: SummaryItem[] | undefined
  loadingRows?: number
}) {
  return (
    <Card plain>
      <CardHeader className="border-b-0 pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {!items ? (
        <div className="flex flex-col gap-3 px-8 py-6" aria-busy="true">
          {Array.from({ length: loadingRows }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <dl className="py-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-4 px-8 py-5">
              <dt className="text-sm text-muted-foreground">{item.label}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tabular-nums">{item.value}</span>
                {item.unit && <span className="text-base text-muted-foreground">{item.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}
