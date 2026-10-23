/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trust-blue': '#1E40AF',
        'amber-gold': '#F59E0B',
        'slate-navy': '#0F172A',
        'cool-grey': '#64748B',
        'slate-white': '#F8FAFC',
        surface: {
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E7EBF0',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Fraunces"', 'Georgia', 'serif'],
        heading: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
