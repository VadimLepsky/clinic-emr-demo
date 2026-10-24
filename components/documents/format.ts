const dateFormatter = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' })

export function formatDate(iso: string) {
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return dateFormatter.format(date)
}

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string) {
  const date = new Date(iso)
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function todayIso() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function isImage(mime: string) {
  return mime.startsWith('image/')
}
