/**
 * The demo dataset.
 *
 * ── READ THIS BEFORE YOU PRESENT ─────────────────────────────────────────────
 * Every number in this file is INVENTED for the demo. It is not a Dozer.ai
 * customer result and it must never be presented as one. It exists so the
 * dashboard chapter has something coherent on it while the rep talks.
 *
 * It is, however, internally consistent, which matters more than it sounds: a
 * prospect who adds the machine rows up and gets a different fleet total than
 * the KPI card stops listening to the pitch and starts auditing the slide. The
 * daily series, the per-machine table and the cost-code split all sum to the
 * same 748.6 engine hours and 506.0 working hours. If you edit one, re-run the
 * numbers through the others.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const JOBSITE = {
  name: 'Smith Denison',
  /** Shown under the site name in the dashboard header. */
  scope: 'Heavy civil — utilities and structures',
  /** The reporting window every figure below covers. */
  period: 'Aug 24 – Sep 6, 2026',
  priorPeriod: 'Aug 10 – Aug 23, 2026',
  machines: 8,
} as const;

/* ── Daily fleet hours ───────────────────────────────────────────────────────
 * Two full weeks, Monday to Sunday. Saturdays run short, Sundays are dark. The
 * shape is deliberate: an even sawtooth reads as generated, a real jobsite has
 * a weekend in it, and the weekend is what makes the chart legible as a
 * schedule rather than a wiggle.
 */
export interface DayHours {
  date: string;
  /** Short label for the x-axis. */
  label: string;
  weekday: string;
  engineHours: number;
  workingHours: number;
  /** engineHours - workingHours, i.e. burning fuel and not moving dirt. */
  idleHours: number;
  /** workingHours / engineHours as a percentage, 0 on dark days. */
  utilization: number;
}

const RAW_DAYS: [string, string, number, number][] = [
  // date, weekday, engine hours, working hours
  ['2026-08-24', 'Mon', 68.4, 43.1],
  ['2026-08-25', 'Tue', 71.2, 47.0],
  ['2026-08-26', 'Wed', 70.5, 48.6],
  ['2026-08-27', 'Thu', 69.8, 44.0],
  ['2026-08-28', 'Fri', 66.1, 40.9],
  ['2026-08-29', 'Sat', 24.3, 16.8],
  ['2026-08-30', 'Sun', 0, 0],
  ['2026-08-31', 'Mon', 72.0, 49.7],
  ['2026-09-01', 'Tue', 73.4, 52.1],
  ['2026-09-02', 'Wed', 71.9, 51.0],
  ['2026-09-03', 'Thu', 70.2, 49.9],
  ['2026-09-04', 'Fri', 68.7, 47.4],
  ['2026-09-05', 'Sat', 22.1, 15.5],
  ['2026-09-06', 'Sun', 0, 0],
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DAYS: DayHours[] = RAW_DAYS.map(([date, weekday, engineHours, workingHours]) => {
  const [, m, d] = date.split('-');
  return {
    date,
    label: `${MONTHS[Number(m) - 1]} ${Number(d)}`,
    weekday,
    engineHours,
    workingHours,
    idleHours: round1(engineHours - workingHours),
    utilization: engineHours === 0 ? 0 : round1((workingHours / engineHours) * 100),
  };
});

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const sum = (xs: number[]) => round1(xs.reduce((a, b) => a + b, 0));

export const TOTALS = {
  engineHours: sum(DAYS.map((d) => d.engineHours)), // 748.6
  workingHours: sum(DAYS.map((d) => d.workingHours)), // 506.0
  get idleHours() {
    return round1(this.engineHours - this.workingHours);
  },
  get utilization() {
    return round1((this.workingHours / this.engineHours) * 100);
  },
};

/* ── KPI row ─────────────────────────────────────────────────────────────────
 * `betterWhen` is not decoration. Idle hours falling 13% is good news, and a
 * badge that paints every minus sign red would tell the prospect the opposite
 * of what the rep is saying out loud. The badge colour follows the meaning of
 * the metric, not the sign of the number.
 */
export interface Kpi {
  id: string;
  label: string;
  value: string;
  /** Percentage-point or percent change against the prior period. */
  delta: number;
  deltaLabel: string;
  betterWhen: 'up' | 'down';
  /** One line the rep can read straight off the screen. */
  note: string;
}

export const KPIS: Kpi[] = [
  {
    id: 'utilization',
    label: 'Fleet utilization',
    value: '67.6%',
    delta: 5.3,
    deltaLabel: '+5.3 pts',
    betterWhen: 'up',
    note: 'Working hours as a share of engine hours, across all eight machines.',
  },
  {
    id: 'engine',
    label: 'Engine hours',
    value: '748.6',
    delta: 2.2,
    deltaLabel: '+2.2%',
    betterWhen: 'up',
    note: 'Metered from the machine, not from a timesheet.',
  },
  {
    id: 'idle',
    label: 'Idle hours',
    value: '242.6',
    delta: -13.3,
    deltaLabel: '−13.3%',
    betterWhen: 'down',
    note: 'Burning fuel, not moving dirt. The single most recoverable number here.',
  },
  {
    id: 'proximity',
    label: 'Proximity alerts',
    value: '68',
    delta: -34.1,
    deltaLabel: '−34.1%',
    betterWhen: 'down',
    note: 'In-cab alerts fired when a person entered a machine’s danger zone.',
  },
  {
    id: 'events',
    label: 'Recorded events',
    value: '12',
    delta: -25.0,
    deltaLabel: '−25.0%',
    betterWhen: 'down',
    note: 'Clips retained for review. Every one has video attached.',
  },
];

/* ── Per-machine table ───────────────────────────────────────────────────────
 * Sums to TOTALS exactly. See the header note.
 */
export interface MachineRow {
  id: string;
  model: string;
  type: 'Excavator' | 'Dozer' | 'Wheel loader' | 'Haul truck';
  engineHours: number;
  workingHours: number;
  utilization: number;
  /** Cost code this machine booked the most hours to. */
  topCostCode: string;
  proximityAlerts: number;
}

const RAW_MACHINES: [string, string, MachineRow['type'], number, number, string, number][] = [
  ['EX-220', 'CAT 336', 'Excavator', 112.4, 81.9, '17000', 14],
  ['EX-118', 'Deere 350G', 'Excavator', 104.7, 72.2, '17000', 11],
  ['EX-105', 'Kobelco SK210', 'Excavator', 88.3, 55.4, '19000', 9],
  ['DZ-402', 'CAT D6', 'Dozer', 96.1, 64.4, '17500', 7],
  ['LD-311', 'CAT 966', 'Wheel loader', 91.5, 62.2, '17500', 10],
  ['LD-315', 'Deere 744', 'Wheel loader', 84.9, 51.7, '17500', 8],
  ['HT-501', 'Volvo A40G', 'Haul truck', 91.2, 62.0, '17000', 5],
  ['HT-502', 'Volvo A40G', 'Haul truck', 79.5, 56.2, '17000', 4],
];

export const MACHINE_ROWS: MachineRow[] = RAW_MACHINES.map(
  ([id, model, type, engineHours, workingHours, topCostCode, proximityAlerts]) => ({
    id,
    model,
    type,
    engineHours,
    workingHours,
    utilization: round1((workingHours / engineHours) * 100),
    topCostCode,
    proximityAlerts,
  }),
);

/* ── Cost codes ──────────────────────────────────────────────────────────────
 * Splits the 506.0 working hours. Colours live in lib/tokens.ts because the
 * charts and the legend both need them.
 */
export interface CostCodeHours {
  code: string;
  name: string;
  hours: number;
  share: number;
  /** Hours the same code took in the prior period, for the comparison bar. */
  priorHours: number;
}

const RAW_COST: [string, string, number, number][] = [
  ['17000', 'Excavation', 214.8, 201.3],
  ['17500', 'Backfill', 121.5, 118.0],
  ['19000', 'Conduit', 96.3, 88.4],
  ['20000', 'Box', 73.4, 82.7],
];

export const COST_CODE_HOURS: CostCodeHours[] = RAW_COST.map(([code, name, hours, priorHours]) => ({
  code,
  name,
  hours,
  priorHours,
  share: round1((hours / 506.0) * 100),
}));

/** Daily cost-code split, stacked in the chapter's stacked-area chart. */
export const COST_BY_DAY = DAYS.map((d) => {
  // Weighted from each code's overall share, with a slow drift so conduit ramps
  // in the second week the way a real utilities package does.
  const t = DAYS.indexOf(d) / (DAYS.length - 1);
  const w = d.workingHours;
  const conduit = 0.15 + 0.09 * t;
  const box = 0.17 - 0.06 * t;
  const backfill = 0.24;
  const excavation = 1 - conduit - box - backfill;
  return {
    label: d.label,
    weekday: d.weekday,
    '17000': round1(w * excavation),
    '17500': round1(w * backfill),
    '19000': round1(w * conduit),
    '20000': round1(w * box),
  };
});

/* ── Safety events ───────────────────────────────────────────────────────────
 * The list behind the "recorded events" KPI. Timestamps are mono in the UI.
 */
export interface SafetyEvent {
  id: string;
  timestamp: string;
  machine: string;
  kind: 'Proximity' | 'Blind zone entry' | 'Reverse';
  /** How close the person got, metres. */
  distance: number;
  severity: 'Critical' | 'Warning';
  outcome: string;
}

export const SAFETY_EVENTS: SafetyEvent[] = [
  {
    id: 'ev-4417',
    timestamp: '09-04 14:22:07',
    machine: 'EX-220',
    kind: 'Blind zone entry',
    distance: 2.4,
    severity: 'Critical',
    outcome: 'Operator alerted, swing stopped',
  },
  {
    id: 'ev-4402',
    timestamp: '09-03 10:41:55',
    machine: 'LD-311',
    kind: 'Proximity',
    distance: 3.1,
    severity: 'Critical',
    outcome: 'Operator alerted, spotter re-briefed',
  },
  {
    id: 'ev-4388',
    timestamp: '09-02 16:08:12',
    machine: 'HT-501',
    kind: 'Reverse',
    distance: 4.6,
    severity: 'Warning',
    outcome: 'Operator alerted, cleared',
  },
  {
    id: 'ev-4361',
    timestamp: '09-01 07:55:30',
    machine: 'EX-118',
    kind: 'Proximity',
    distance: 3.8,
    severity: 'Warning',
    outcome: 'Operator alerted, cleared',
  },
  {
    id: 'ev-4340',
    timestamp: '08-28 13:17:44',
    machine: 'DZ-402',
    kind: 'Blind zone entry',
    distance: 2.9,
    severity: 'Critical',
    outcome: 'Reviewed in weekly toolbox talk',
  },
];

/* ── The map ─────────────────────────────────────────────────────────────────
 * Drawn as SVG rather than pulled from a tile server: no runtime network calls
 * is a hard requirement, and a map that fails to load is the worst thing that
 * can happen on a shared screen.
 *
 * Coordinates live in a 240x100 space because that is the shape of the panel it
 * is drawn into (495x206 on the 1920-wide stage, so 2.4:1). Authoring in a
 * square space and letting `preserveAspectRatio="slice"` crop the difference
 * threw away the top and bottom of the geofence — the one thing on the panel
 * the rep actually points at.
 */
export const MAP = {
  /** The SVG viewBox these coordinates are authored in. */
  viewBox: '0 0 240 100',

  /** Dashed black geofence polygon — the site boundary. */
  geofence: [
    [26, 20],
    [104, 12],
    [178, 22],
    [214, 46],
    [196, 82],
    [92, 90],
    [34, 66],
  ] as [number, number][],

  /** Dark diamond markers, one per machine currently reporting. */
  markers: [
    { id: 'EX-220', x: 66, y: 38 },
    { id: 'EX-118', x: 112, y: 28 },
    { id: 'EX-105', x: 158, y: 40 },
    { id: 'DZ-402', x: 96, y: 60 },
    { id: 'LD-311', x: 52, y: 50 },
    { id: 'LD-315', x: 140, y: 68 },
    { id: 'HT-501', x: 184, y: 56 },
    { id: 'HT-502', x: 78, y: 76 },
  ],

  /** Grayscale street grid. Each entry is a polyline through the viewBox. */
  streets: [
    { d: 'M 0 32 L 240 24', w: 2.4 },
    { d: 'M 0 70 L 240 64', w: 2.4 },
    { d: 'M 44 0 L 58 100', w: 2.4 },
    { d: 'M 150 0 L 162 100', w: 2.4 },
    { d: 'M 0 50 L 240 45', w: 1.2 },
    { d: 'M 96 0 L 108 100', w: 1.2 },
    { d: 'M 0 88 L 240 82', w: 1.2 },
    { d: 'M 204 0 L 214 100', w: 1.2 },
  ],

  /** Building footprints, mid-gray. */
  blocks: [
    { x: 6, y: 36, w: 30, h: 9 },
    { x: 68, y: 4, w: 20, h: 14 },
    { x: 172, y: 28, w: 24, h: 12 },
    { x: 12, y: 74, w: 24, h: 11 },
    { x: 196, y: 88, w: 34, h: 10 },
    { x: 118, y: 84, w: 22, h: 9 },
  ],
} as const;

/* ── The AI report ───────────────────────────────────────────────────────────
 * Written the way the product writes one: it names the number, says what moved
 * it, and ends on something a superintendent can actually do on Monday.
 */
export const AI_REPORT = {
  generated: '2026-09-07 06:00',
  title: `Weekly summary — ${JOBSITE.name}`,
  paragraphs: [
    `Fleet utilization finished the two weeks at 67.6%, up 5.3 points on the prior period. The gain is almost entirely week two: the fleet ran 70.2% against 64.9% in week one, on roughly the same engine hours.`,
    `Idle came down 13.3% to 242.6 hours. The largest single contributor was the haul truck pair — HT-501 and HT-502 spent less time queued at the load point after the second excavator moved onto the conduit run on Aug 31.`,
    `Conduit (19000) took 96.3 hours, up from 88.4, and is now 19.0% of booked work. Box (20000) fell to 73.4 hours. That tracks the schedule; nothing here looks off-plan.`,
    `Two machines are worth a look. EX-105 ran 62.7% utilization, the lowest on site, against 72.9% for EX-220 on comparable work. LD-315 sat at 60.9% with eight proximity alerts, six of them on the same two afternoons.`,
  ],
  actions: [
    'Review the Aug 28 and Sep 4 afternoon alerts on LD-315 with the crew — same machine, same window, twice.',
    'EX-105 is idling through the morning load-out. Worth ten minutes with the superintendent.',
    'Conduit is ahead of the backfill it feeds. Check the sequencing before next week.',
  ],
} as const;

/* ── The pilot offer ─────────────────────────────────────────────────────────
 * One machine, 45 days, one small fee. Deliberately the smallest thing a
 * contractor can say yes to without convening anyone.
 *
 * Everything the close chapter says about the offer is read from here — the
 * slide, its heading, and the speaker notes — so this is the only place to
 * change it. The fee amount is the one value still outstanding; see below.
 */
export const PILOT = {
  machines: 'One machine',
  duration: '45 days',
  install: 'Installed on your yard, in one visit',
  /**
   * ⚠ SET THE AMOUNT BEFORE YOU PRESENT.
   *
   * The offer is a single small fee — one line, no per-seat, no per-suite, no
   * setup charge on top — which is the whole point of it: a number small enough
   * that nobody has to build a business case to say yes. The FIGURE has not
   * been given to me, so it is not written here. Put it in and the warning
   * styling on the close slide disappears on its own.
   *
   * The slide flags any value still containing "confirm" or "TBC" in yellow,
   * so an unset price cannot quietly reach a prospect looking like a real one.
   */
  price: 'One flat fee — confirm the amount',
  includes: [
    'Full camera and depth-sensor package on the pilot machine',
    'In-cab alerting live from day one',
    'Safety and Productivity suites, both switched on',
    'Weekly AI report to whoever you nominate',
    'A read-out session with your team at day 21 and day 45',
  ],
  exit: 'Uninstall at the end at no cost if you do not continue.',
} as const;
