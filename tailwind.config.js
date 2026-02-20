/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1714',
        'surface-light': '#242019',
        'surface-card': '#2e2a24',
        'surface-hover': '#3a352e',
        border: '#3e3830',
        caramel: '#c4956a',
        'caramel-light': '#d4aa80',
        cream: '#f5efe6',
        muted: '#9a8e80',
        accent: '#e8a04c',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-out both',
        'fade-up-delay': 'fadeUp 0.8s 0.15s ease-out both',
        'fade-up-delay-2': 'fadeUp 0.8s 0.3s ease-out both',
        'fade-up-delay-3': 'fadeUp 0.8s 0.45s ease-out both',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 4s ease-in-out infinite',
        'count': 'count 0.6s ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(196,149,106,0.15)' },
          '50%': { boxShadow: '0 0 60px rgba(196,149,106,0.35)' },
        },
      },
    },
  },
  plugins: [],
};
