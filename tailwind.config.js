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
    },
  },
  plugins: [],
};
