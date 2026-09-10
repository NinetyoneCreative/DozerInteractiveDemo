'use client';

/**
 * The deck's icon set.
 *
 * Hand-drawn rather than pulled from a library, for one reason that matters:
 * an icon set designed for web UI is drawn at 16-24px and reads as a toolbar
 * when blown up to 44px on a 1920px canvas. These are drawn AT the size they
 * are used, on a 44-unit grid, at the same 1.6 stroke as the artwork in the
 * system diagram, so they sit in the design rather than on top of it.
 *
 * Conventions, kept to strictly so the set reads as one family:
 *   • 44x44 viewBox, ~4 units of padding
 *   • strokes in `line` (#4d5260), never filled shapes for structure
 *   • exactly ONE accented element per icon, in brand yellow — the part the
 *     icon is actually about. An icon where everything is yellow says nothing
 *     about what matters in it, and yellow is an accent in this design, not a
 *     fill.
 *   • round caps and joins throughout
 */

import type { IconName } from '@/lib/deck';

export type { IconName };

const LINE = '#4d5260';
const ACCENT = '#fdac13';
const MUTED = '#a7aab1';

export function Icon({ name, size = 44 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke={LINE}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {GLYPHS[name]}
    </svg>
  );
}

const GLYPHS: Record<IconName, React.ReactNode> = {
  /* ── Safety suite ─────────────────────────────────────────────────────── */

  // A camera body on a mount, with its cone of view accented.
  camera: (
    <>
      <rect x="6" y="12" width="20" height="14" rx="3" />
      <path d="M16 26 V32 M11 32 H21" />
      <path d="M26 16 L38 11 V27 L26 22 Z" fill={ACCENT} stroke={ACCENT} />
    </>
  ),

  // Depth: pulses returning off a plane, the measured one accented.
  depth: (
    <>
      <path d="M8 10 V34" />
      <path d="M14 22 H30" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M30 18 L34 22 L30 26" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M36 12 A 14 14 0 0 1 36 32" strokeDasharray="2.5 3.5" />
      <circle cx="8" cy="22" r="2.4" fill={LINE} stroke="none" />
    </>
  ),

  // In-cab alert: a screen with a warning on it, radiating.
  alert: (
    <>
      <rect x="7" y="9" width="24" height="18" rx="3" />
      <path d="M19 27 V33 M13 33 H25" />
      <path d="M19 14 V19" stroke={ACCENT} strokeWidth="2.4" />
      <circle cx="19" cy="22.6" r="1.3" fill={ACCENT} stroke="none" />
      <path d="M35 13 A 11 11 0 0 1 35 27" stroke={ACCENT} />
    </>
  ),

  // Event clip: a frame with a play triangle.
  clip: (
    <>
      <rect x="6" y="10" width="32" height="24" rx="3" />
      <path d="M6 16 H38" />
      <path d="M19 21 L27 25.5 L19 30 Z" fill={ACCENT} stroke={ACCENT} />
    </>
  ),

  // Leading indicator: a rising trend read BEFORE the incident line.
  leading: (
    <>
      <path d="M7 35 V9 M7 35 H37" />
      <path d="M11 29 L18 24 L24 27 L33 15" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M33 15 H29 M33 15 V19" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M11 33 H33" strokeDasharray="2 3" stroke={MUTED} />
    </>
  ),

  // Evidence: a clip attached to a talk — a frame with a speech tail.
  evidence: (
    <>
      <rect x="6" y="9" width="22" height="17" rx="3" />
      <path d="M12 26 L12 32 L18 26" />
      <path d="M14 15 L21 18.5 L14 22 Z" fill={ACCENT} stroke={ACCENT} />
      <path d="M32 14 H38 M32 20 H38 M32 26 H36" stroke={MUTED} />
    </>
  ),

  // Defensible record: a dated document, stamped.
  record: (
    <>
      <path d="M11 7 H26 L33 14 V37 H11 Z" />
      <path d="M26 7 V14 H33" />
      <path d="M16 21 H28 M16 26 H28 M16 31 H23" stroke={MUTED} />
      <circle cx="30" cy="31" r="5" stroke={ACCENT} strokeWidth="2" />
      <path d="M27.6 31 L29.4 32.8 L32.6 29.4" stroke={ACCENT} strokeWidth="2" />
    </>
  ),

  /* ── Productivity ─────────────────────────────────────────────────────── */

  // Utilization: a dial with its needle on the measured value.
  gauge: (
    <>
      <path d="M7 30 A 15 15 0 0 1 37 30" />
      <path d="M22 30 L31 19" stroke={ACCENT} strokeWidth="2.4" />
      <circle cx="22" cy="30" r="2.6" fill={ACCENT} stroke="none" />
      <path d="M9 34 H35" />
    </>
  ),

  // Cost code: a tag with its number.
  costcode: (
    <>
      <path d="M8 20 L20 8 H34 V22 L22 34 Z" />
      <circle cx="28" cy="14" r="2.6" />
      <path d="M15 22 H26" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M17 27 H23" stroke={ACCENT} strokeWidth="2.2" />
    </>
  ),

  // AI report: a written page with a highlighted conclusion.
  report: (
    <>
      <path d="M10 7 H34 V37 H10 Z" />
      <path d="M15 15 H29 M15 20 H29 M15 25 H24" stroke={MUTED} />
      <path d="M15 31 H27" stroke={ACCENT} strokeWidth="2.4" />
    </>
  ),

  /* ── Rollout ──────────────────────────────────────────────────────────── */

  // The machine itself, from the side.
  machine: (
    <>
      <rect x="6" y="26" width="22" height="7" rx="3.5" />
      <path d="M10 26 V18 H22 V26" />
      <path d="M22 20 L33 12 L37 18" stroke={ACCENT} strokeWidth="2.2" />
      <circle cx="12" cy="29.5" r="1.4" fill={LINE} stroke="none" />
      <circle cx="22" cy="29.5" r="1.4" fill={LINE} stroke="none" />
    </>
  ),

  // One person who knows the fleet.
  person: (
    <>
      <circle cx="22" cy="15" r="6" />
      <path d="M10 35 A 12 12 0 0 1 34 35" />
      <path d="M31 12 L34 15 L39 9" stroke={ACCENT} strokeWidth="2.2" />
    </>
  ),


  // Nothing for the operator to do: an empty cab seat, already handled.
  operator: (
    <>
      <path d="M11 27 V14 A 3.5 3.5 0 0 1 14.5 10.5 H17 A 3.5 3.5 0 0 1 20.5 14 V25" />
      <path d="M11 25 H26 A 3.5 3.5 0 0 1 29.5 28.5 V31" />
      <path d="M13 36 H28 M16 31 V36" />
      <circle cx="34" cy="14" r="6" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M31.3 14 L33.4 16.1 L37 12.4" stroke={ACCENT} strokeWidth="2.2" />
    </>
  ),

  // Nothing for the foreman to file.
  clipboard: (
    <>
      <path d="M12 10 H32 V37 H12 Z" />
      <path d="M18 7 H26 V13 H18 Z" />
      <path d="M17 22 H27 M17 28 H24" stroke={MUTED} />
      <path d="M29 20 L37 12" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M29 12 L37 20" stroke={ACCENT} strokeWidth="2.2" />
    </>
  ),

  // One person owns the dashboard.
  owner: (
    <>
      <rect x="6" y="10" width="24" height="17" rx="3" />
      <path d="M11 22 V17 M16 22 V14 M21 22 V19 M26 22 V15" stroke={MUTED} />
      <circle cx="33" cy="29" r="5" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M26 38 A 7 7 0 0 1 40 38" stroke={ACCENT} strokeWidth="2.2" />
    </>
  ),

  /* ── Timeline ─────────────────────────────────────────────────────────── */

  // Week 0, scope: a checklist being agreed.
  scope: (
    <>
      <path d="M11 8 H33 V36 H11 Z" />
      <path d="M16 17 L18.5 19.5 L23 15" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M16 27 L18.5 29.5 L23 25" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M26 17.5 H29 M26 27.5 H29" stroke={MUTED} />
    </>
  ),

  // Week 1, install: hardware bolted to the machine.
  install: (
    <>
      {/* The machine surface, and the bracket fixed to it. */}
      <path d="M8 7 V37" strokeWidth="2.4" />
      <path d="M8 15 H16 M8 29 H16" />
      <circle cx="13" cy="15" r="1.8" fill={LINE} stroke="none" />
      <circle cx="13" cy="29" r="1.8" fill={LINE} stroke="none" />
      <path d="M16 12 H19 V32 H16" />
      {/* The camera on the end of it. */}
      <rect x="19" y="15" width="14" height="12" rx="3" stroke={ACCENT} strokeWidth="2.2" />
      <path d="M33 17.5 L38 14.5 V27.5 L33 24.5 Z" fill={ACCENT} stroke={ACCENT} />
    </>
  ),

  // Week 1, alerts live.
  live: (
    <>
      <circle cx="22" cy="22" r="4.5" fill={ACCENT} stroke={ACCENT} />
      <path d="M13 13 A 12.7 12.7 0 0 0 13 31" stroke={ACCENT} strokeWidth="2" />
      <path d="M31 13 A 12.7 12.7 0 0 1 31 31" stroke={ACCENT} strokeWidth="2" />
      <path d="M7.5 7.5 A 20.5 20.5 0 0 0 7.5 36.5" />
      <path d="M36.5 7.5 A 20.5 20.5 0 0 1 36.5 36.5" />
    </>
  ),

  // Week 3, first real report: bars with enough history to compare.
  chart: (
    <>
      <path d="M7 35 V9 M7 35 H37" />
      <rect x="12" y="24" width="6" height="11" />
      <rect x="21" y="19" width="6" height="16" />
      <rect x="30" y="14" width="6" height="21" fill={ACCENT} stroke={ACCENT} />
    </>
  ),

  // Mid-point read-out: two people over a number.
  readout: (
    <>
      <circle cx="15" cy="14" r="4.5" />
      <path d="M7 27 A 8 8 0 0 1 23 27" />
      <circle cx="30" cy="16" r="4" stroke={MUTED} />
      <path d="M23.5 27 A 7 7 0 0 1 37 27" stroke={MUTED} />
      <path d="M12 34 H32" stroke={ACCENT} strokeWidth="2.4" />
    </>
  ),

  // End of pilot: the decision.
  flag: (
    <>
      <path d="M12 37 V7" />
      <path d="M12 9 H33 L28 16 L33 23 H12 Z" fill={ACCENT} stroke={ACCENT} />
    </>
  ),

  /* ── Close ────────────────────────────────────────────────────────────── */

  calendar: (
    <>
      <rect x="7" y="11" width="30" height="26" rx="3" />
      <path d="M7 19 H37 M15 7 V14 M29 7 V14" />
      <rect x="26" y="25" width="7" height="7" rx="1.5" fill={ACCENT} stroke={ACCENT} />
    </>
  ),

};
