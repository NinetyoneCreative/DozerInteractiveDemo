'use client';

/**
 * The talk-track slides: cover, agenda, statement, points, timeline, pilot and
 * close. No data, no interaction — these are the ones the rep talks over.
 */

import { CHAPTERS, TOTAL_SECONDS, formatClock } from '@/lib/deck';
import type { Phase, Point } from '@/lib/deck';
import { JOBSITE, PILOT } from '@/lib/demoData';
import { Card, GUTTER, Logo, Reveal, SlideFrame } from './Frame';

/* ── Cover ───────────────────────────────────────────────────────────────── */

export function CoverSlide() {
  return (
    <div className={`flex h-full flex-col justify-center ${GUTTER} pb-20`}>
      <Reveal>
        {/* The wordmark carries the brand on its own. The mono "DOZER.AI" that
            used to sit beside the placeholder mark is gone — setting the name
            twice, once as a logo and once as a caption, read as a stand-in
            waiting to be replaced, which is exactly what it was. */}
        <Logo width={228} />
      </Reveal>

      <Reveal delay={0.06}>
        <h1 className="mt-14 max-w-[1400px] text-[92px] font-medium leading-[1.02] tracking-[-0.02em] text-dozer-heading">
          On-machine cameras that
          <br />
          keep people out of the way
          <span className="text-dozer-yellow">.</span>
        </h1>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="mt-12 max-w-[900px] text-[24px] leading-snug text-dozer-body">
          Rugged cameras and depth sensors mounted directly on excavators, dozers, loaders
          and haul trucks. In-cab alerts, proximity detection and event recording — and the
          same hardware reporting what the fleet did all day.
        </p>
      </Reveal>

      <Reveal delay={0.18}>
        <div className="mt-16 flex items-center gap-8 border-t border-dozer-muted/40 pt-7">
          <div>
            <p className="eyebrow text-dozer-muted">Prepared for</p>
            <p className="mt-1.5 text-[22px] font-medium text-dozer-heading">{JOBSITE.name}</p>
          </div>
          <span className="h-10 w-px bg-dozer-muted/40" />
          <div>
            <p className="eyebrow text-dozer-muted">Running time</p>
            <p className="mt-1.5 font-mono text-[22px] text-dozer-heading">
              ~{Math.round(TOTAL_SECONDS / 60)} min
            </p>
          </div>
          <span className="h-10 w-px bg-dozer-muted/40" />
          <div>
            <p className="eyebrow text-dozer-muted">Press</p>
            <p className="mt-1.5 font-mono text-[22px] text-dozer-heading">? for keys</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ── Agenda ──────────────────────────────────────────────────────────────── */

export function AgendaSlide() {
  return (
    <SlideFrame eyebrow="This call" title="What we are going to do">
      <div className="grid grid-cols-4 gap-x-5 gap-y-6">
        {CHAPTERS.map((c, i) => (
          <Reveal key={c.slug} delay={0.04 + i * 0.035}>
            <Card className="flex h-[184px] flex-col p-6">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[26px] tabular-nums text-dozer-yellow">
                  {String(c.index + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-eyebrow text-dozer-muted">
                  {formatClock(c.seconds)}
                </span>
              </div>
              <h3 className="mt-3 text-[20px] font-medium leading-tight text-dozer-heading">
                {c.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-snug text-dozer-body">{c.summary}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </SlideFrame>
  );
}

/* ── Statement ───────────────────────────────────────────────────────────── */

export function StatementSlide({
  lead,
  sub,
  stat,
}: {
  lead: string;
  sub?: string;
  stat?: { value: string; label: string };
}) {
  return (
    <div className={`flex h-full flex-col justify-center ${GUTTER} pb-16`}>
      <Reveal>
        <p className="max-w-[1500px] text-[54px] font-medium leading-[1.16] tracking-[-0.015em] text-dozer-heading">
          {lead}
        </p>
      </Reveal>

      {sub && (
        <Reveal delay={0.08}>
          <p className="mt-10 max-w-[1150px] border-l-2 border-dozer-yellow pl-7 text-[24px] leading-relaxed text-dozer-body">
            {sub}
          </p>
        </Reveal>
      )}

      {stat && (
        <Reveal delay={0.14}>
          <div className="mt-14 flex items-baseline gap-5">
            <span className="font-mono text-[76px] leading-none text-dozer-heading">
              {stat.value}
            </span>
            <span className="eyebrow max-w-[400px] leading-relaxed">{stat.label}</span>
          </div>
        </Reveal>
      )}
    </div>
  );
}

/* ── Points ──────────────────────────────────────────────────────────────── */

export function PointsSlide({
  eyebrow,
  title,
  intro,
  points,
  columns = 3,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  points: Point[];
  columns?: 2 | 3;
}) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title}>
      {intro && (
        <Reveal delay={0.05}>
          <p className="mb-10 max-w-[1100px] text-[22px] leading-relaxed text-dozer-body">
            {intro}
          </p>
        </Reveal>
      )}

      <div className={`grid gap-6 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {points.map((p, i) => (
          <Reveal key={p.title} delay={0.08 + i * 0.06}>
            <Card className="flex h-full min-h-[300px] flex-col p-9">
              {p.stat ? (
                <p className="eyebrow-yellow">{p.stat}</p>
              ) : (
                <span className="block h-[3px] w-10 rounded-full bg-dozer-yellow" />
              )}
              <h3 className="mt-5 text-[28px] font-medium leading-tight text-dozer-heading">
                {p.title}
              </h3>
              <p className="mt-4 text-[18px] leading-relaxed text-dozer-body">{p.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </SlideFrame>
  );
}

/* ── Timeline ────────────────────────────────────────────────────────────── */

export function TimelineSlide({
  eyebrow,
  title,
  phases,
}: {
  eyebrow: string;
  title: string;
  phases: Phase[];
}) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title}>
      <div className="relative pt-14">
        {/* The spine. Sits behind the markers, at their vertical centre. */}
        <div className="absolute left-0 right-0 top-[70px] h-px bg-dozer-muted/40" />

        {/* Column count follows the data. It was pinned at 5, so adding the
            day-21 read-out silently wrapped the last phase onto a second row
            underneath the spine. */}
        <div
          className="relative grid gap-5"
          style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))` }}
        >
          {phases.map((p, i) => (
            <Reveal key={`${p.when}-${p.title}`} delay={0.06 + i * 0.07}>
              <div className="flex flex-col">
                <div className="relative flex h-4 items-center">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-dozer-yellow bg-dozer-card" />
                </div>
                <p className="mt-6 font-mono text-[13px] uppercase tracking-eyebrow text-dozer-yellow">
                  {p.when}
                </p>
                <h3 className="mt-2.5 text-[26px] font-medium leading-tight text-dozer-heading">
                  {p.title}
                </h3>
                <p className="mt-3 text-[17px] leading-relaxed text-dozer-body">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

/* ── Pilot ───────────────────────────────────────────────────────────────── */

export function PilotSlide() {
  /* The price is a placeholder until someone signs off on it. Rather than
     printing an unconfirmed figure in the same type as everything else — where
     a rep skim-reading on a live call would sail straight past it — an
     unconfirmed value gets marked in the UI. See PILOT in lib/demoData.ts. */
  const priceUnconfirmed = /tbc|confirm/i.test(PILOT.price);

  return (
    /* Heading built from PILOT rather than typed out. It said "four machines
       for 90 days" while the terms underneath it said something else, which is
       exactly the kind of thing a prospect reads out loud back to you. */
    <SlideFrame
      eyebrow="The offer"
      title={`Put it on ${PILOT.machines.toLowerCase()} for ${PILOT.duration}`}
    >
      <div className="grid grid-cols-[1.15fr_1fr] gap-8">
        <Reveal delay={0.05}>
          <Card className="h-full p-10" accent>
            <div className="grid grid-cols-2 gap-x-10 gap-y-8">
              <Term label="Scope" value={PILOT.machines} />
              <Term label="Duration" value={PILOT.duration} />
              <Term label="Install" value={PILOT.install} />
              <Term
                label="Commercials"
                value={PILOT.price}
                warn={priceUnconfirmed}
              />
            </div>

            <div className="mt-10 border-t border-dozer-muted/40 pt-7">
              <p className="eyebrow text-dozer-muted">No lock-in</p>
              <p className="mt-2.5 text-[21px] leading-snug text-dozer-heading">{PILOT.exit}</p>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.11}>
          <Card className="h-full p-10">
            <p className="eyebrow text-dozer-muted">What is included</p>
            <ul className="mt-6 space-y-4">
              {PILOT.includes.map((line) => (
                <li key={line} className="flex gap-4">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-dozer-yellow" />
                  <span className="text-[17.5px] leading-relaxed text-dozer-body">{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </div>
    </SlideFrame>
  );
}

function Term({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="eyebrow text-dozer-muted">{label}</p>
      <p
        className={[
          'mt-2 text-[24px] font-medium leading-snug',
          warn ? 'text-dozer-yellow' : 'text-dozer-heading',
        ].join(' ')}
      >
        {value}
      </p>
      {warn && (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-eyebrow text-dozer-muted">
          Placeholder — set PILOT.price
        </p>
      )}
    </div>
  );
}

/* ── Close ───────────────────────────────────────────────────────────────── */

export function CloseSlide() {
  const next: Point[] = [
    {
      stat: 'Today',
      title: 'Pick the machine',
      body: 'One, chosen by you. The one you worry about, not the one that demos well.',
    },
    {
      stat: 'This week',
      title: 'Name the owner',
      body: 'One person who will read the weekly report. Without a name, a pilot ends in a shrug.',
    },
    {
      stat: 'Next week',
      title: 'An hour with your equipment manager',
      body: 'The machine, your cost codes, and a date for the install. That is the whole scoping call.',
    },
  ];

  return (
    <SlideFrame eyebrow="Next" title="Two things before we finish">
      <div className="grid grid-cols-3 gap-6">
        {next.map((p, i) => (
          <Reveal key={p.title} delay={0.06 + i * 0.07}>
            <Card className="flex h-full min-h-[290px] flex-col p-9">
              <p className="eyebrow-yellow">{p.stat}</p>
              <h3 className="mt-5 text-[28px] font-medium leading-tight text-dozer-heading">
                {p.title}
              </h3>
              <p className="mt-4 text-[18px] leading-relaxed text-dozer-body">{p.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.28}>
        <div className="mt-10 flex items-end justify-between gap-12">
          <p className="max-w-[1240px] border-l-2 border-dozer-yellow pl-7 text-[24px] leading-relaxed text-dozer-body">
            Everything on the screen today came off one install. Cameras that keep people
            away from the machine, and the same cameras telling you what the machine did.
          </p>
          <Logo width={150} className="mb-1 shrink-0" />
        </div>
      </Reveal>
    </SlideFrame>
  );
}
