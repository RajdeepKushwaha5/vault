/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:   { 900: '#080c20', 800: '#0d1230', 700: '#131a3e', 600: '#1a2352' },
        indigo: { 500: '#6366f1', 400: '#818cf8', 300: '#a5b4fc' },
        teal:   { 500: '#14b8a6', 400: '#2dd4bf', 300: '#5eead4' },
        danger: '#ef4444',
        warn:   '#f59e0b',
        safe:   '#22c55e',
      },
      fontFamily: {
        sans: ['Instrument Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
