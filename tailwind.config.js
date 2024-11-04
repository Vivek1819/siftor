/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      backgroundImage: {
        'custom-diagonal': 'linear-gradient(60deg, #000000, #6e6e6e)',
      },
      keyframes: {
        gradient: {
          '0%': { backgroundPosition: '0% 100%' },
          '25%': { backgroundPosition: '50% 100%' },
          '50%': { backgroundPosition: '0% 100%' },
          '75%': { backgroundPosition: '50% 100%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      animation: {
        'gradient-flow': 'gradient 10s ease infinite',
      },
    },
  },
  plugins: [],
}