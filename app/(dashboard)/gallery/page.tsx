import type { Metadata } from 'next'
import { GalleryContent } from '@/components/gallery/gallery-content'

export const metadata: Metadata = { title: 'Galleri' }

export default function GalleryPage() {
  return <GalleryContent />
}
