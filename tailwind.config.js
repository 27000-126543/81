/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'bg-dark': '#0F172A',
        'bg-card': '#1E293B',
        'bg-hover': '#334155',
        'primary': '#1E40AF',
        'primary-light': '#3B82F6',
        'primary-dark': '#1E3A8A',
        'cyan': '#06B6D4',
        'cyan-light': '#22D3EE',
        'green': '#10B981',
        'green-light': '#34D399',
        'amber': '#F59E0B',
        'amber-light': '#FBBF24',
        'red': '#EF4444',
        'red-light': '#F87171',
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
        'text-muted': '#64748B',
        'border-color': '#334155',
      },
      fontFamily: {
        'sans': ['"Space Grotesk"', '"Noto Sans SC"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)' },
        }
      }
    },
  },
  plugins: [],
};
