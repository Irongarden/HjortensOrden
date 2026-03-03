/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Base palette ── */
        obsidian:  { DEFAULT: '#0f1115', 50: '#1a1e24', 100: '#161a1f', 200: '#0f1115' },
        charcoal:  { DEFAULT: '#1c2028', 50: '#262c36', 100: '#1c2028', 200: '#161b22' },
        surface:   { DEFAULT: '#222830', 50: '#2d3440', 100: '#222830', 200: '#1a2028' },
        border:    { DEFAULT: '#2e3540', muted: '#232a34' },

        /* ── Forest green ── */
        forest: {
          50:  '#e8f5ee',
          100: '#c5e7d4',
          200: '#8ecfaa',
          300: '#56b77f',
          400: '#2e9f62',
          500: '#1a7a49',
          600: '#155f39',
          700: '#10472b',
          800: '#0b2f1d',
          900: '#061810',
          DEFAULT: '#1a7a49',
        },

        /* ── Muted gold ── */
        gold: {
          50:  '#fdf8ec',
          100: '#f7eccd',
          200: '#edd89a',
          300: '#dfc06a',
          400: '#cfa84a',
          500: '#b8922e',
          600: '#9a7524',
          700: '#7a5b1c',
          800: '#5c4213',
          900: '#3d2b0b',
          DEFAULT: '#cfa84a',
          muted:   '#a88030',
          subtle:  '#6b5020',
        },

        /* ── Text ── */
        parchment: '#e8e0d0',
        ivory:     '#f0ebe2',
        muted:     '#8a9099',
        'parchment-text': '#3d2b0b',
      },

      fontFamily: {
        serif:    ['Playfair Display', 'Georgia', 'serif'],
        sans:     ['Inter', 'system-ui', 'sans-serif'],
        mono:     ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'display-xl': ['3.5rem',  { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm': ['1.875rem',{ lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['1.5rem',  { lineHeight: '1.3', letterSpacing: '0em',     fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0.005em', fontWeight: '500' }],
        'heading-sm': ['1.125rem',{ lineHeight: '1.4', letterSpacing: '0.005em', fontWeight: '500' }],
        'label-lg':   ['0.875rem',{ lineHeight: '1.5', letterSpacing: '0.08em',  fontWeight: '600' }],
        'label-sm':   ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.1em',   fontWeight: '600' }],
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
        sidebar: '16rem',
      },

      borderRadius: {
        'xs': '0.125rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        'gold-sm':  '0 0 0 1px rgba(207, 168, 74, 0.15)',
        'gold-md':  '0 0 0 1px rgba(207, 168, 74, 0.25), 0 4px 24px rgba(207, 168, 74, 0.08)',
        'green-sm': '0 0 0 1px rgba(26, 122, 73, 0.2)',
        'green-md': '0 0 0 1px rgba(26, 122, 73, 0.3), 0 4px 24px rgba(26, 122, 73, 0.1)',
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.2)',
        'modal':    '0 8px 64px rgba(0,0,0,0.6), 0 2px 16px rgba(0,0,0,0.4)',
        'inset-sm': 'inset 0 1px 3px rgba(0,0,0,0.4)',
      },

      backgroundImage: {
        'gradient-radial':      'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold':        'linear-gradient(135deg, #cfa84a 0%, #8a6520 100%)',
        'gradient-green':       'linear-gradient(135deg, #1a7a49 0%, #0b2f1d 100%)',
        'gradient-dark':        'linear-gradient(180deg, #1c2028 0%, #0f1115 100%)',
        'gradient-surface':     'linear-gradient(135deg, #222830 0%, #1a2028 100%)',
        'noise':                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },

      animation: {
        'fade-in':      'fadeIn 0.4s ease-out',
        'fade-up':      'fadeUp 0.5s ease-out',
        'slide-in-left':'slideInLeft 0.3s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'shimmer':      'shimmer 2s linear infinite',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
        'spin-slow':    'spin 3s linear infinite',
      },

      keyframes: {
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp:      { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideInRight:{ from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(207, 168, 74, 0)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(207, 168, 74, 0.15)' },
        },
      },

      transitionTimingFunction: {
        'in-expo':  'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'in-out-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
