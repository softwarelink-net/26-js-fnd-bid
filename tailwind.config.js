/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fund: {
          navy: '#1e1b4b',
          deep: '#082f49',
          sky: '#0369a1',
          teal: '#0d9488',
          mint: '#14b8a6',
          ice: '#ecfeff',
          slate: '#0f172a',
        },
      },
      fontFamily: {
        display: ['"Source Han Sans SC"', '"Noto Sans SC"', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 40px rgba(8, 47, 73, 0.12)',
      },
    },
  },
  plugins: [],
}
