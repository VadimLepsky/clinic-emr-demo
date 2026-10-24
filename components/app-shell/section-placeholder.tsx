import { Page, PageHeader } from './page'

export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <Page>
      <PageHeader title={title} />
      <div className="rounded-2xl bg-card px-8 py-12 text-center text-muted-foreground dark:border dark:border-border">
        Розділ буде додано пізніше.
      </div>
    </Page>
  )
}
