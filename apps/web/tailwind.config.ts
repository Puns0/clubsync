import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque Variable"', 'sans-serif'],
      },
      colors: {
        paper: '#F6F1E7', // Warm off-white
        ink: '#1C1917',   // Near-black
        accent: '#D63A2B', // Hot vermilion
        muted: '#8C8478', // Warm gray
        surface: '#FFFFFF', // Clean white for cards
        outline: '#DDD3BF', // Subtle borders
      },
      boxShadow: {
        card: '0 4px 0 0 #1C1917',
        'card-hover': '0 6px 0 0 #1C1917',
      },
      borderRadius: {
        ticket: '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
