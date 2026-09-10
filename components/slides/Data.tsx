'use client';

/**
 * The two slides that put the demo dataset on screen outside the dashboard: the
 * safety event log, and the written AI report.
 *
 * Both carry a sample-data chip. It is small and it is permanent. A rep should
 * never be one forgotten caveat away from a prospect believing these are another
 * customer's numbers.
 */

import { AI_REPORT, JOBSITE, SAFETY_EVENTS } from '@/lib/demoData';
import { Card, ProductShot, Reveal, SampleDataChip, SlideFrame } from './Frame';

/* ── Safety events ───────────────────────────────────────────────────────── */

export function EventsSlide({
  eyebrow,
  title,
  intro,
  image,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  image?: { src: string; alt: string; caption: string };
}) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title}>
      {/* The claim, and a real detection beside it. The log underneath is the
          evidence for both — which is why these used to be two slides and are
          now one: the argument and its proof were being made 100 seconds
          apart. */}
      <Reveal>
        <div className={`mb-7 grid gap-12 ${image ? 'grid-cols-[1fr_400px]' : ''} items-center`}>
          <p className="border-l-2 border-dozer-yellow pl-7 text-[21px] leading-relaxed text-dozer-body">
            {intro}
          </p>
          {image && (
            <ProductShot
              src={image.src}
              alt={image.alt}
              caption={image.caption}
              imageClassName="block h-[150px] w-full object-cover"
            />
          )}
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-dozer-muted/40 px-8 py-5">
            <div className="flex items-baseline gap-4">
              <p className="text-[19px] font-medium text-dozer-heading">Recorded events</p>
              <p className="font-mono text-[12px] uppercase tracking-eyebrow text-dozer-muted">
                {JOBSITE.period}
              </p>
            </div>
            <SampleDataChip />
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-dozer-muted/30">
                {['Time', 'Machine', 'Event', 'Closest approach', 'Severity', 'Outcome'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={[
                        'px-8 py-4 font-mono text-[11px] uppercase tracking-eyebrow text-dozer-muted',
                        i >= 3 && i <= 4 ? 'text-right' : 'text-left',
                      ].join(' ')}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {SAFETY_EVENTS.map((ev, i) => (
                <tr
                  key={ev.id}
                  className={i > 0 ? 'border-t border-dozer-muted/25' : undefined}
                >
                  <td className="px-8 py-5 font-mono text-[15px] tabular-nums text-dozer-body">
                    {ev.timestamp}
                  </td>
                  <td className="px-8 py-5 font-mono text-[15px] font-medium text-dozer-heading">
                    {ev.machine}
                  </td>
                  <td className="px-8 py-5 text-[16px] text-dozer-heading">{ev.kind}</td>
                  <td className="px-8 py-5 text-right font-mono text-[15px] tabular-nums text-dozer-body">
                    {ev.distance.toFixed(1)} m
                  </td>
                  <td className="px-8 py-5 text-right">
                    <SeverityPill severity={ev.severity} />
                  </td>
                  <td className="px-8 py-5 text-[16px] text-dozer-body">{ev.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Reveal>

    </SlideFrame>
  );
}

function SeverityPill({ severity }: { severity: 'Critical' | 'Warning' }) {
  const critical = severity === 'Critical';
  return (
    <span
      className={[
        'inline-block rounded-card px-3 py-1 font-mono text-[11px] uppercase tracking-eyebrow',
        critical
          ? 'bg-dash-negative-bg text-dash-negative'
          : 'border border-dozer-muted/50 text-dozer-body',
      ].join(' ')}
    >
      {severity}
    </span>
  );
}

/* ── AI report ───────────────────────────────────────────────────────────── */

export function ReportSlide({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title}>
      <div className="grid grid-cols-[1.5fr_1fr] gap-8">
        <Reveal delay={0.05}>
          <Card className="flex h-full flex-col p-10">
            <div className="flex items-baseline justify-between">
              <p className="text-[21px] font-medium text-dozer-heading">{AI_REPORT.title}</p>
              <p className="font-mono text-[12px] uppercase tracking-eyebrow text-dozer-muted">
                Generated {AI_REPORT.generated}
              </p>
            </div>

            <div className="mt-7 space-y-5">
              {AI_REPORT.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={[
                    'text-[17.5px] leading-relaxed',
                    // The second paragraph is the one the rep reads out loud —
                    // it is the one that names specific machines.
                    i === 1 ? 'text-dozer-heading' : 'text-dozer-body',
                  ].join(' ')}
                >
                  {p}
                </p>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <SampleDataChip />
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.12}>
          <Card className="h-full p-10" accent>
            <p className="eyebrow-yellow">Worth a look</p>
            <ul className="mt-7 space-y-6">
              {AI_REPORT.actions.map((a, i) => (
                <li key={a} className="flex gap-5">
                  <span className="font-mono text-[19px] leading-tight text-dozer-yellow">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[17.5px] leading-relaxed text-dozer-body">{a}</span>
                </li>
              ))}
            </ul>

            <p className="mt-10 border-t border-dozer-muted/40 pt-6 text-[15.5px] leading-relaxed text-dozer-muted">
              This is the part that gets forwarded. A superintendent will not open a
              dashboard, but they will read three lines that name their own equipment.
            </p>
          </Card>
        </Reveal>
      </div>
    </SlideFrame>
  );
}
