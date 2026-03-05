import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: { default: 'Hjortens Orden', template: '%s — Hjortens Orden' },
  description: 'Det eksklusive digitale samlingssted for Hjortens Orden.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hjortens Orden',
  },
  icons: {
    icon: '/HOLogoTransparent.png',
    apple: '/HOLogoTransparent.png',
    shortcut: '/HOLogoTransparent.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f1115',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-obsidian text-parchment antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
