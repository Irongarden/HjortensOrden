import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInYears, parseISO } from 'date-fns'
import { da } from 'date-fns/locale'

// ── Classname merging ──────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date formatting ────────────────────────────
export function formatDate(date: string | Date, fmt = 'd. MMMM yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: da })
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d. MMMM yyyy 'kl.' HH:mm", { locale: da })
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: da })
}

export function getMembershipYears(joinedAt: string): number {
  return differenceInYears(new Date(), parseISO(joinedAt))
}

export function getMonthKey(date = new Date()): string {
  return format(date, 'yyyy-MM')
}

// ── Currency formatting ────────────────────────
export function formatDKK(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))

  if (showSign && amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

// ── String utilities ───────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'oe')
    .replace(/[å]/g, 'aa')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim()
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '…'
}

// ── Number utilities ───────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function pct(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

// ── Array utilities ────────────────────────────
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, dir: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const av = a[key], bv = b[key]
    if (av === bv) return 0
    const cmp = av < bv ? -1 : 1
    return dir === 'asc' ? cmp : -cmp
  })
}

// ── CSV export ─────────────────────────────────
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: Partial<Record<keyof T, string>>
): void {
  if (!data.length) return
  const keys = Object.keys(data[0]) as (keyof T)[]
  const header = keys.map((k) => headers?.[k] ?? String(k)).join(';')
  const rows = data.map((row) =>
    keys.map((k) => {
      const val = row[k]
      if (val === null || val === undefined) return ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(';') || str.includes('"') || str.includes('\n')
        ? `"${str}"`
        : str
    }).join(';')
  )
  const csv = '\uFEFF' + [header, ...rows].join('\n') // BOM for Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ── Image utilities ────────────────────────────
export function getSupabaseStorageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`
}

/**
 * Resize + compress an image file client-side using the Canvas API.
 * If the image is already within limits it is returned unchanged.
 *
 * @param maxPx   Maximum width or height in pixels (default 2000)
 * @param quality JPEG quality 0–1 (default 0.85)
 */
export async function compressImage(
  file: File,
  { maxPx = 2000, quality = 0.85 }: { maxPx?: number; quality?: number } = {},
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= maxPx && height <= maxPx) {
        resolve(file)
        return
      }
      if (width > height) {
        height = Math.round((height / width) * maxPx)
        width = maxPx
      } else {
        width = Math.round((width / height) * maxPx)
        height = maxPx
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Komprimering fejlede')); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kunne ikke indlæse billede')) }
    img.src = url
  })
}

// ── Misc ───────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateToken(): string {
  return crypto.randomUUID()
}
