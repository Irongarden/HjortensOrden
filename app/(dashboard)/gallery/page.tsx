import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

const GalleryContent = dynamic(
  () => import('@/components/gallery/gallery-content').then((m) => m.GalleryContent),
  { ssr: false },
)

export const metadata: Metadata = { title: 'Galleri' }

export default function GalleryPage() {
  return <GalleryContent />
}
