import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sunshine Nexus Design System colors
        dawn: {
          100: '#F0F4FF',
          300: '#C7D2FE',
          500: '#6366F1',
          700: '#4338CA',
          900: '#1E1B4B',
        },
        morning: {
          100: '#FEF3C7',
          300: '#FCD34D',
          500: '#F59E0B',
          700: '#D97706',
          900: '#78350F',
        },
        noon: {
          100: '#FFEDD5',
          300: '#FDBA74',
          500: '#FB923C',
          700: '#EA580C',
          900: '#7C2D12',
        },
        twilight: {
          100: '#FCE7F3',
          300: '#F9A8D4',
          500: '#EC4899',
          700: '#BE185D',
          900: '#500724',
        },
        // Semantic colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Special purpose
        'mcp-pulse': '#06B6D4',
        'sacred-gold': '#FCD34D',
        'nexus-core': '#8B5CF6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      animation: {
        'mcp-pulse': 'mcp-pulse 2s ease-in-out infinite',
        'solar-progress': 'solar-progress 10s linear infinite',
      },
      keyframes: {
        'mcp-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'solar-progress': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [animate],
}

export default config
