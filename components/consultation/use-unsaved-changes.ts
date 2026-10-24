'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Warns before leaving with unsaved changes: browser unload (native prompt)
 * and in-app link clicks (custom dialog). App Router has no route-change events,
 * so link clicks are intercepted in the capture phase before Next's Link handler.
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter()
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const [pending, setPending] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      e.preventDefault()
      e.stopPropagation()
      setPending(() => () => router.push(url.pathname + url.search + url.hash))
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty, router])

  const requestLeave = useCallback((leave: () => void) => {
    if (dirtyRef.current) setPending(() => leave)
    else leave()
  }, [])

  const confirmLeave = useCallback(() => {
    const leave = pending
    setPending(null)
    dirtyRef.current = false
    leave?.()
  }, [pending])

  const cancelLeave = useCallback(() => setPending(null), [])

  return { isPromptOpen: pending !== null, requestLeave, confirmLeave, cancelLeave }
}
