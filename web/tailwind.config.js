/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: 'var(--color-dark-900)',
          800: 'var(--color-dark-800)',
          700: 'var(--color-dark-700)',
          600: 'var(--color-dark-600)',
          500: 'var(--color-dark-500)',
        },
        accent: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
          dim: '#991b1b',
        },
      },
    },
  },
  plugins: [],
};
