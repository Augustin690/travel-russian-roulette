/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1923',
        'ink-800': '#17222e',
        'ink-700': '#1f2d3b',
        cream: '#f5f0e8',
        vermilion: '#e84c3d',
        'vermilion-dark': '#c73b2d',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        spin: '0 10px 30px -6px rgba(232,76,61,0.55), inset 0 0 0 2px rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
};
