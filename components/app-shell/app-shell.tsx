import { getCurrentUser } from '@/lib/data'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from './app-sidebar'
import { ContentCorner } from './content-corner'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset className="min-w-0 bg-canvas">
          <main className="min-w-0 flex-1 px-4 pt-8 pb-10 sm:px-6 md:px-10 md:pt-10 print:p-0">
            <ContentCorner />
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
