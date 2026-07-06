/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dot: {
          bg:           'var(--dot-bg)',
          surface:      'var(--dot-surface)',
          white:        'var(--dot-white)',
          rose:         'var(--dot-rose)',
          'rose-light': 'var(--dot-rose-light)',
          'rose-mid':   'var(--dot-rose-mid)',
          sage:         'var(--dot-sage)',
          'sage-light': 'var(--dot-sage-light)',
          text:         'var(--dot-text)',
          muted:        'var(--dot-muted)',
          border:       'var(--dot-border)',
        },
      },
      fontFamily: {
        sans: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
