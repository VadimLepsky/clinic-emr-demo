'use client'

import { useSyncExternalStore } from 'react'

export type EditorLayout = 'document' | 'form'

const STORAGE_KEY = 'emr.consultation-editor-layout'
const listeners = new Set<() => void>()
let current: EditorLayout | null = null

function readStored(): EditorLayout {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'form' ? 'form' : 'document'
  } catch {
    return 'document'
  }
}

function getSnapshot(): EditorLayout {
  current ??= readStored()
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    current = readStored()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function setLayout(layout: EditorLayout) {
  current = layout
  try {
    window.localStorage.setItem(STORAGE_KEY, layout)
  } catch {
    // Storage may be unavailable (private mode, quota); keep the in-memory choice.
  }
  for (const listener of listeners) listener()
}

export function useEditorLayout() {
  const layout = useSyncExternalStore(subscribe, getSnapshot, () => 'document' as const)
  return [layout, setLayout] as const
}
