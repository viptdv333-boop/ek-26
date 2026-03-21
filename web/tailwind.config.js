/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#22222f',
          500: '#2a2a38',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          dim: '#4f46e5',
        },
      },
    },
  },
  plugins: [],
};
