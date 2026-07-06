/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dot: {
          bg:      '#FFF8F5',
          surface: '#FFF0EA',
          rose:    '#C27BA0',
          'rose-light': '#F0DCE9',
          sage:    '#8BAF9C',
          'sage-light': '#D6EAE1',
          text:    '#3D3D3D',
          muted:   '#8A8A8A',
          border:  '#E8D5DF',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
