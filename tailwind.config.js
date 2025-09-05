/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      maxWidth: {
        '8xl': '90rem', // 1440px
        '9xl': '100rem' // 1600px
      }
    }
  },
  plugins: [],
}
