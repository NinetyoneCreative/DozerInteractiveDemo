/**
 * Design tokens, in one place.
 *
 * Tailwind reads these through tailwind.config.ts. Anything that cannot go
 * through a Tailwind class — a Recharts `fill`, a three.js material, an inline
 * SVG stroke — imports from here instead, so there is exactly one definition of
 * every colour in the app.
 */

export const COLORS = {
  /** Accent only. Never a large fill — it is a highlight, not a surface. */
  yellow: '#fdac13',
  page: '#f4f7f9',
  card: '#ffffff',
  heading: '#4d5260',
  body: '#5c6374',
  /** Muted text and every 1px border in the app. */
  muted: '#a7aab1',
} as const;

/**
 * Tokens taken from the product dashboard rather than the marketing site. The
 * dashboard chapter recreates a real screen, so its selected-state near-black
 * and its delta badges do not come from the brand palette above.
 */
export const DASH = {
  /** Selected tabs and pills: near-black fill, white text. */
  selected: '#111827',
  selectedText: '#ffffff',
  positive: '#16a34a',
  positiveBg: '#dcfce7',
  negative: '#dc2626',
  negativeBg: '#fee2e2',
  gridLine: '#eef2f5',
} as const;

/** Cost codes, with the colours the product uses for them. */
export const COST_CODES = [
  { code: '17000', name: 'Excavation', color: '#3b82f6' },
  { code: '17500', name: 'Backfill', color: '#f59e0b' },
  { code: '19000', name: 'Conduit', color: '#22c55e' },
  { code: '20000', name: 'Box', color: '#8b5cf6' },
] as const;

export const COST_CODE_COLOR: Record<string, string> = Object.fromEntries(
  COST_CODES.map((c) => [c.code, c.color]),
);

/**
 * The stage is authored at this size and scaled to fit. Every layout number in
 * the slides is a real pixel at 1920×1080, which is what makes the deck
 * predictable to lay out — nothing is responsive, it just scales.
 */
export const STAGE = { width: 1920, height: 1080 } as const;

export const RADIUS = 8;
