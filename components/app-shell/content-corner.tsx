import { SidebarTrigger } from '@/components/ui/sidebar'

// Перемикач теми живе в заголовку сторінки (PageHeader) і в привітанні на головній;
// тут лишається лише кнопка меню для мобільних.
export function ContentCorner() {
  return (
    <div className="mb-4 md:hidden print:hidden">
      <SidebarTrigger aria-label="Відкрити меню" />
    </div>
  )
}
