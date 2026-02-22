/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        pitch: {
          950: '#020d08',
          900: '#061a10',
          800: '#0a2d1a',
          700: '#0f4026',
          600: '#145233',
        },
        grass: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
        },
        panel: 'rgba(10, 20, 15, 0.85)',
      },
      backgroundImage: {
        'pitch-gradient': 'linear-gradient(135deg, #020d08 0%, #061a10 50%, #020d08 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(14,30,20,0.9) 0%, rgba(6,16,10,0.95) 100%)',
        'score-high': 'linear-gradient(90deg, #16a34a, #22c55e)',
        'score-mid': 'linear-gradient(90deg, #b45309, #f59e0b)',
        'score-low': 'linear-gradient(90deg, #b91c1c, #ef4444)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34,197,94,0.2)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.2)',
        'glow-red': '0 0 20px rgba(239,68,68,0.2)',
        'panel': '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
