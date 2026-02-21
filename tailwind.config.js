/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a',
        paper: '#2d2d2d',
        primary: '#90caf9',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mystical: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
};