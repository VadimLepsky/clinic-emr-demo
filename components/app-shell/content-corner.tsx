import { SidebarTrigger } from '@/components/ui/sidebar'

// The theme toggle lives in the page header (PageHeader) and in the home greeting;
// only the mobile menu button stays here.
export function ContentCorner() {
  return (
    <div className="mb-4 md:hidden print:hidden">
      <SidebarTrigger aria-label="Open menu" />
    </div>
  )
}
