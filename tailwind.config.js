/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand palette — deep charcoal + electric teal accent
        brand: {
          50: '#edfcf9',
          100: '#d2f7ef',
          200: '#a9ede0',
          300: '#72ddcc',
          400: '#3ec5b3',
          500: '#22a899',
          600: '#18887e',
          700: '#176d67',
          800: '#175753',
          900: '#174845',
          950: '#072b2a',
        },
        surface: {
          0: '#0c0f14',
          50: '#111621',
          100: '#171d2b',
          200: '#1e2536',
          300: '#252e42',
          400: '#313b52',
          500: '#4a5568',
          600: '#718096',
          700: '#a0aec0',
          800: '#cbd5e0',
          900: '#e2e8f0',
          950: '#f7fafc',
        },
        accent: {
          coral: '#FF6B6B',
          amber: '#FFAB4C',
          violet: '#A78BFA',
          sky: '#38BDF8',
        },
      },
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        glow: '0 0 24px rgba(34, 168, 153, 0.15)',
        'glow-lg': '0 0 48px rgba(34, 168, 153, 0.2)',
        card: '0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        pulse_slow: 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
