/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.7rem', { lineHeight: '1.25' }],
        sm: ['0.8rem', { lineHeight: '1.35' }],
        base: ['0.875rem', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};
