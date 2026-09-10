import type { Config } from 'tailwindcss';
import { COLORS, DASH } from './lib/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dozer: {
          yellow: COLORS.yellow,
          page: COLORS.page,
          card: COLORS.card,
          heading: COLORS.heading,
          body: COLORS.body,
          muted: COLORS.muted,
        },
        dash: {
          selected: DASH.selected,
          positive: DASH.positive,
          'positive-bg': DASH.positiveBg,
          negative: DASH.negative,
          'negative-bg': DASH.negativeBg,
          grid: DASH.gridLine,
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '8px',
      },
      fontFamily: {
        // Gotham is licensed. --font-gotham resolves to it once the webfont
        // files are dropped in /public/fonts; until then it falls through to
        // Montserrat and then the system stack. See app/globals.css.
        sans: ['var(--font-gotham)', 'Montserrat', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', '"Share Tech Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Soft shadows are for floating callouts only — cards get a 1px border.
        callout: '0 8px 28px -8px rgba(77, 82, 96, 0.24), 0 2px 6px -2px rgba(77, 82, 96, 0.12)',
        laser: '0 0 0 6px rgba(253, 172, 19, 0.22), 0 0 18px 4px rgba(253, 172, 19, 0.45)',
      },
      letterSpacing: {
        eyebrow: '0.16em',
      },
    },
  },
  plugins: [],
};

export default config;
