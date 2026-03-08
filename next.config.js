/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Service worker must never be cached — browsers need to fetch a fresh
        // copy on every navigation to detect updates. Any CDN or browser cache
        // here would prevent the kill-switch from reaching the user.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
}

module.exports = nextConfig
