/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  // Use NetworkFirst for HTML pages so new deployments always serve fresh HTML.
  // Without this, the service worker can cache old HTML that references old JS
  // chunk hashes, causing the browser to run stale code even after a new build.
  runtimeCaching: [
    {
      urlPattern: /^\/(?:dashboard|events|timeline|gallery|members|admin|inspiration|polls|treasury|hierarchy|profile|vedtaegter)(\?.*)?$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
})

const nextConfig = {
  reactStrictMode: true,
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

module.exports = withPWA(nextConfig)
