'use client';

/**
 * A recreation of the product dashboard, laid out for the stage.
 *
 * The chapter walks it one region at a time. `focus` names the region under
 * discussion; everything else dims. That is why the whole screen is built as one
 * component with a focus prop rather than as seven separate slides — the
 * prospect keeps looking at the same screen while the emphasis moves, so by the
 * end of the chapter they have seen the real thing seven times rather than seven
 * different pictures of it.
 *
 * Tokens here come from the product UI, not the marketing palette: selected tabs
 * and pills are near-black with white text, delta badges are solid green or red,
 * and the cost-code series keep their product colours. They live in
 * lib/tokens.ts under DASH and COST_CODES.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardFocus } from '@/lib/deck';
import {
  COST_BY_DAY,
  COST_CODE_HOURS,
  DAYS,
  JOBSITE,
  KPIS,
  MACHINE_ROWS,
  MAP,
  TOTALS,
} from '@/lib/demoData';
import type { Kpi } from '@/lib/demoData';
import { COLORS, COST_CODES, DASH } from '@/lib/tokens';

export function Dashboard({ focus }: { focus: DashboardFocus }) {
  /*
     Every row is an explicit height rather than a flex fraction. The stage is a
     fixed 1920x1080 canvas, so there is no unknown to solve for — and a `flex-1`
     row on a canvas this full is one long cost-code label away from collapsing
     the machines table to nothing, which is exactly what it did the first time.
     These five numbers plus the gaps are the height budget; if you add a row,
     take the pixels off another one on purpose.
  */
  return (
    <div className="flex h-full flex-col gap-3.5">
      <Region id="filters" focus={focus} className="h-[56px] shrink-0">
        <Filters />
      </Region>

      <Region id="kpis" focus={focus} className="h-[104px] shrink-0">
        <KpiRow />
      </Region>

      <div className="grid h-[270px] shrink-0 grid-rows-[270px] grid-cols-[1fr_1fr_0.92fr] gap-3.5">
        <Region id="utilization" focus={focus}>
          <UtilizationPanel />
        </Region>
        <Region id="costcodes" focus={focus}>
          <CostCodePanel />
        </Region>
        <Region id="map" focus={focus}>
          <MapPanel />
        </Region>
      </div>

      <Region id="machines" focus={focus} className="h-[330px] shrink-0">
        <MachinesPanel />
      </Region>
    </div>
  );
}

/* ── Focus wrapper ───────────────────────────────────────────────────────────
 * Dimming rather than hiding. The screen has to stay recognisable as one screen
 * for the guided pass to be worth anything — a region that vanished would turn
 * each step into a different slide, which is exactly what this chapter is
 * trying not to be.
 */
function Region({
  id,
  focus,
  children,
  className = '',
}: {
  id: Exclude<DashboardFocus, null>;
  focus: DashboardFocus;
  children: React.ReactNode;
  className?: string;
}) {
  const dimmed = focus !== null && focus !== id;
  const lit = focus === id;

  return (
    <div
      className={[
        'relative rounded-card transition-all duration-300',
        dimmed ? 'opacity-[0.22]' : 'opacity-100',
        className,
      ].join(' ')}
    >
      {children}
      {/* The highlight ring sits above the panel rather than on its border, so a
          panel that already has a border does not end up with two. */}
      <div
        className={[
          'pointer-events-none absolute -inset-1.5 rounded-[12px] ring-2 transition-opacity duration-300',
          lit ? 'opacity-100 ring-dozer-yellow' : 'opacity-0 ring-transparent',
        ].join(' ')}
      />
    </div>
  );
}

/* ── Panel chrome ────────────────────────────────────────────────────────── */

function Panel({
  title,
  meta,
  children,
  className = '',
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-card border border-dozer-muted/40 bg-dozer-card ${className}`}
    >
      <div className="flex shrink-0 items-baseline justify-between px-5 pb-3 pt-4">
        <h3 className="text-[15px] font-medium text-dozer-heading">{title}</h3>
        {meta && (
          <p className="font-mono text-[10.5px] uppercase tracking-eyebrow text-dozer-muted">
            {meta}
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 px-5 pb-4">{children}</div>
    </div>
  );
}

/* ── Filters ─────────────────────────────────────────────────────────────── */

function Filters() {
  return (
    <div className="flex h-full items-center justify-between rounded-card border border-dozer-muted/40 bg-dozer-card px-5">
      <div className="flex items-baseline gap-4">
        <h2 className="text-[19px] font-medium text-dozer-heading">{JOBSITE.name}</h2>
        <span className="h-4 w-px bg-dozer-muted/50" />
        <p className="text-[13.5px] text-dozer-body">{JOBSITE.scope}</p>
      </div>

      <div className="flex items-center gap-6">
        <Tabs label="Period" options={['7 days', '14 days', '30 days', 'Custom']} selected="14 days" />
        <span className="h-5 w-px bg-dozer-muted/40" />
        <Tabs label="Fleet" options={['All machines', 'Excavators', 'Loaders', 'Trucks']} selected="All machines" />
      </div>
    </div>
  );
}

/**
 * Selected pills are near-black with white text; unselected are white with a
 * muted 1px border. Brand yellow deliberately stays out of it — in the product
 * these are structural controls, and yellow is reserved for the deck's own
 * highlight so the two never compete on screen.
 */
function Tabs({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-eyebrow text-dozer-muted">
        {label}
      </span>
      <div className="flex gap-1.5">
        {options.map((o) => {
          const on = o === selected;
          return (
            <span
              key={o}
              className={[
                'rounded-card px-3 py-1.5 text-[12.5px] leading-none transition-colors',
                on
                  ? 'bg-dash-selected font-medium text-white'
                  : 'border border-dozer-muted/50 bg-dozer-card text-dozer-body',
              ].join(' ')}
            >
              {o}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── KPI row ─────────────────────────────────────────────────────────────── */

function KpiRow() {
  return (
    <div className="grid h-full grid-cols-5 gap-3.5">
      {KPIS.map((k) => (
        <KpiCard key={k.id} kpi={k} />
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  /* The badge colour follows what the metric MEANS, not the sign of the delta.
     Idle hours falling 13% is good news and gets a green badge; painting every
     minus sign red would have the screen contradicting the rep out loud. */
  const improving = kpi.betterWhen === 'up' ? kpi.delta > 0 : kpi.delta < 0;

  return (
    <div className="flex h-full flex-col justify-center rounded-card border border-dozer-muted/40 bg-dozer-card px-5">
      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-dozer-muted">
        {kpi.label}
      </p>
      <div className="mt-2.5 flex items-baseline gap-3">
        <span className="font-mono text-[30px] leading-none tabular-nums text-dozer-heading">
          {kpi.value}
        </span>
        <span
          className="rounded-card px-2 py-1 font-mono text-[11px] leading-none tabular-nums"
          style={{
            background: improving ? DASH.positiveBg : DASH.negativeBg,
            color: improving ? DASH.positive : DASH.negative,
          }}
        >
          {kpi.deltaLabel}
        </span>
      </div>
      <p className="mt-2.5 text-[11.5px] leading-snug text-dozer-muted">{kpi.note}</p>
    </div>
  );
}

/* ── Utilization ─────────────────────────────────────────────────────────── */

/**
 * Usable height inside a Panel on the 270px charts row.
 *
 * Recharts' <ResponsiveContainer height="100%"> does NOT behave inside a
 * `min-h-0 flex-1` box: it measured itself at 494px in a 206px slot, overflowed
 * the grid row, and painted the cost-code panel straight over the machines
 * table below it. On a fixed 1920x1080 canvas there is no reason to be
 * measuring anything at runtime, so the charts are told their height in pixels.
 */
const PANEL_BODY = 206;
/** The cost-code legend below its chart. Measured, not guessed. */
const LEGEND_H = 58;

const AXIS = {
  stroke: COLORS.muted,
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
};

function UtilizationPanel() {
  // Sundays are dark days and plot as 0%, which would drag a line chart to the
  // floor twice and make the working range unreadable. They are dropped from
  // the series and the gap is left in the axis, which reads correctly as "no
  // work happened" rather than as "utilization collapsed".
  const data = DAYS.filter((d) => d.engineHours > 0);

  return (
    <Panel title="Fleet utilization" meta={`${TOTALS.utilization}% avg`}>
      <ResponsiveContainer width="100%" height={PANEL_BODY}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={DASH.gridLine} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: DASH.gridLine }} interval={1} />
          <YAxis
            domain={[50, 80]}
            ticks={[50, 60, 70, 80]}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: COLORS.heading, fontSize: 12 }}
            formatter={(v) => [`${v as number}%`, 'Utilization'] as [string, string]}
          />
          <Line
            type="monotone"
            dataKey="utilization"
            stroke={DASH.selected}
            strokeWidth={2}
            dot={{ r: 2.5, fill: DASH.selected, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: COLORS.yellow, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: COLORS.card,
  border: `1px solid ${COLORS.muted}`,
  borderRadius: 8,
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  color: COLORS.body,
  padding: '8px 10px',
};

/* ── Cost codes ──────────────────────────────────────────────────────────── */

function CostCodePanel() {
  /* Sundays are dark days and stack to zero. Left in, the area chart pinches to
     the floor twice and reads as two separate jobs rather than one fortnight —
     so they come out here for the same reason they come out of the utilization
     line. */
  const workedDays = COST_BY_DAY.filter((d) => d.weekday !== 'Sun');

  return (
    <Panel title="Hours by cost code" meta={`${TOTALS.workingHours} hrs`}>
      <div className="flex flex-col">
        <div style={{ height: PANEL_BODY - LEGEND_H }}>
          <ResponsiveContainer width="100%" height={PANEL_BODY - LEGEND_H}>
            <AreaChart data={workedDays} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={DASH.gridLine} vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: DASH.gridLine }} interval={2} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: COLORS.heading, fontSize: 12 }} />
              {COST_CODES.map((c) => (
                <Area
                  key={c.code}
                  type="monotone"
                  dataKey={c.code}
                  stackId="hours"
                  stroke={c.color}
                  strokeWidth={1.4}
                  fill={c.color}
                  fillOpacity={0.72}
                  name={`${c.code} ${c.name}`}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend doubles as the totals table — the chart shows the shape, the
            legend gives the rep the numbers to say out loud. */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-dozer-muted/30 pt-2.5">
          {COST_CODE_HOURS.map((c) => {
            const meta = COST_CODES.find((x) => x.code === c.code)!;
            const up = c.hours >= c.priorHours;
            return (
              <div key={c.code} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: meta.color }}
                />
                <span className="font-mono text-[10.5px] tabular-nums text-dozer-muted">
                  {c.code}
                </span>
                <span className="truncate text-[11.5px] text-dozer-body">{c.name}</span>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-dozer-heading">
                  {c.hours.toFixed(1)}
                </span>
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: up ? DASH.positive : DASH.negative }}
                >
                  {up ? '▲' : '▼'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ── Map ─────────────────────────────────────────────────────────────────────
 * Drawn, not fetched. A tile server is a runtime network call and a map that
 * fails to load on a shared screen is the worst thing that can happen in this
 * chapter. Grayscale streets, a dashed black geofence, dark diamond markers.
 */
function MapPanel() {
  return (
    <Panel title="Site" meta={`${MAP.markers.length} reporting`}>
      {/* Explicit height, like the charts. The SVG's 100x100 viewBox gives it a
          1:1 intrinsic ratio, so `h-full` inside an auto-sized box resolved
          against its ~495px WIDTH and stretched the whole grid row — taking the
          two chart panels with it, since grid items share a row height. */}
      <div
        style={{ height: PANEL_BODY }}
        className="overflow-hidden rounded-card border border-dozer-muted/30 bg-[#e9edf0]"
      >
        <svg
          viewBox={MAP.viewBox}
          preserveAspectRatio="xMidYMid slice"
          className="block h-full w-full"
          role="img"
          aria-label={`Site map for ${JOBSITE.name}, ${MAP.markers.length} machines inside the geofence`}
        >
          {/* Blocks under streets, so the streets read as cut through them. */}
          {MAP.blocks.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill="#dfe4e8" rx="0.6" />
          ))}

          {MAP.streets.map((s, i) => (
            <path key={i} d={s.d} stroke="#ffffff" strokeWidth={s.w} fill="none" strokeLinecap="round" />
          ))}

          {/* Geofence: dashed black, with the enclosed area lifted slightly so
              inside and outside are distinguishable without a fill colour. */}
          <polygon
            points={MAP.geofence.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="#111827"
            fillOpacity="0.05"
            stroke="#111827"
            strokeWidth="0.7"
            strokeDasharray="2 1.4"
            strokeLinejoin="round"
          />

          {MAP.markers.map((m) => (
            <g key={m.id} transform={`translate(${m.x} ${m.y})`}>
              {/* Diamond: a square on its corner. */}
              <rect
                x="-2.6"
                y="-2.6"
                width="5.2"
                height="5.2"
                transform="rotate(45)"
                fill="#111827"
                stroke="#ffffff"
                strokeWidth="0.8"
              />
            </g>
          ))}
        </svg>
      </div>
    </Panel>
  );
}

/* ── Machines ────────────────────────────────────────────────────────────── */

function MachinesPanel() {
  const best = Math.max(...MACHINE_ROWS.map((m) => m.utilization));
  const worst = Math.min(...MACHINE_ROWS.map((m) => m.utilization));

  return (
    <Panel title="By machine" meta={`fleet avg ${TOTALS.utilization}%`} className="min-h-0">
      <div className="h-full overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {['Machine', 'Model', 'Type', 'Engine hrs', 'Working hrs', 'Utilization', 'Top code', 'Alerts'].map(
                (h, i) => (
                  <th
                    key={h}
                    className={[
                      'pb-2 font-mono text-[9.5px] uppercase tracking-eyebrow text-dozer-muted',
                      i >= 3 ? 'text-right' : 'text-left',
                      i === 5 ? 'w-[190px]' : '',
                    ].join(' ')}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {MACHINE_ROWS.map((m) => {
              const meta = COST_CODES.find((c) => c.code === m.topCostCode)!;
              // Only the extremes get marked. Colouring every row would turn a
              // table into a heat map and bury the ten-point spread that is the
              // entire point of this panel.
              const extreme =
                m.utilization === best ? 'best' : m.utilization === worst ? 'worst' : null;

              return (
                <tr key={m.id} className="h-[29px] border-t border-dozer-muted/25">
                  <td className="py-0 font-mono text-[12.5px] font-medium text-dozer-heading">
                    {m.id}
                  </td>
                  <td className="py-0 text-[12.5px] text-dozer-body">{m.model}</td>
                  <td className="py-0 text-[12.5px] text-dozer-body">{m.type}</td>
                  <td className="py-0 text-right font-mono text-[12.5px] tabular-nums text-dozer-body">
                    {m.engineHours.toFixed(1)}
                  </td>
                  <td className="py-0 text-right font-mono text-[12.5px] tabular-nums text-dozer-body">
                    {m.workingHours.toFixed(1)}
                  </td>
                  <td className="py-0 pl-6">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dozer-page">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${m.utilization}%`,
                            background:
                              extreme === 'best'
                                ? DASH.positive
                                : extreme === 'worst'
                                  ? DASH.negative
                                  : DASH.selected,
                          }}
                        />
                      </div>
                      <span className="w-11 shrink-0 text-right font-mono text-[12.5px] tabular-nums text-dozer-heading">
                        {m.utilization.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-0 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-[2px]"
                        style={{ background: meta.color }}
                      />
                      <span className="font-mono text-[11.5px] tabular-nums text-dozer-body">
                        {m.topCostCode}
                      </span>
                    </span>
                  </td>
                  <td className="py-0 text-right font-mono text-[12.5px] tabular-nums text-dozer-body">
                    {m.proximityAlerts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
