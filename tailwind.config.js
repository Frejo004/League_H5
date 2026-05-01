/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        surface: {
          DEFAULT: '#080f1a',
          card:    '#0f1d2e',
          border:  '#1e3448',
          muted:   '#2d4a63',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(74,222,128,0.2)',
        'glow':    '0 0 24px rgba(74,222,128,0.3)',
        'glow-lg': '0 0 48px rgba(74,222,128,0.25)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(74,222,128,0.25)' },
          '50%':      { boxShadow: '0 0 28px rgba(74,222,128,0.6), 0 0 60px rgba(74,222,128,0.15)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up':    'fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':       'fadeIn 0.3s ease both',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':      'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        'glow-pulse':    'glowPulse 2.5s ease-in-out infinite',
        'float':         'float 4s ease-in-out infinite',
        'shimmer':       'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}
