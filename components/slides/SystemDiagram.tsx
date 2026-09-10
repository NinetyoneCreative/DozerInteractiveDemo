'use client';

/**
 * The how-it-works diagram, in three stages.
 *
 * The same component serves four steps of chapter 2 — the whole picture, then
 * each stage in turn — by dimming the stages that are not the current subject
 * rather than by cutting to a different slide. Keeping the diagram in place
 * while the emphasis moves means the prospect never loses the shape of the
 * system, which is the one thing chapter 2 has to leave behind.
 *
 * The arrow labels carry the claim that matters: the alert path never leaves the
 * machine. Everything to the right of the cab is reporting, and reporting can
 * afford to wait for a signal. Alerting cannot.
 */

import { motion } from 'framer-motion';
import { Card, Reveal, SlideFrame } from './Frame';

type Stage = 'machine' | 'cab' | 'cloud';

const STAGES: {
  key: Stage;
  eyebrow: string;
  title: string;
  body: string;
  detail: string[];
}[] = [
  {
    key: 'machine',
    eyebrow: 'On the machine',
    title: 'Cameras and depth sensors',
    body: 'Mounted to the iron, covering the ground the operator cannot see from the seat.',
    detail: [
      'Rugged housings, mounted for vibration and wash-down',
      'Depth sensing, so the system knows distance and not just movement',
      'Excavators, dozers, loaders, haul trucks',
    ],
  },
  {
    key: 'cab',
    eyebrow: 'In the cab',
    title: 'The operator is told',
    body: 'Proximity detection fires an alert in the seat, while the machine is still moving.',
    detail: [
      'Alerts computed on the machine — nothing waits on a signal',
      'A threshold, not a motion sensor: the alert has a distance behind it',
      'Nothing for the operator to open, start or remember',
    ],
  },
  {
    key: 'cloud',
    eyebrow: 'In the office',
    title: 'Recorded, and reported',
    body: 'Events with video attached, plus the hours behind the Productivity suite.',
    detail: [
      'Every alert keeps a clip, so nobody reconstructs it from memory',
      'Utilization and cost-code hours from the same install',
      'A written weekly report to whoever you nominate',
    ],
  },
];

export function SystemDiagramSlide({
  eyebrow,
  title,
  highlight,
}: {
  eyebrow: string;
  title: string;
  highlight: Stage | null;
}) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title}>
      <div className="flex items-stretch gap-0">
        {STAGES.map((stage, i) => {
          const active = highlight === null || highlight === stage.key;
          return (
            <div key={stage.key} className="flex min-w-0 flex-1 items-stretch">
              <Reveal delay={0.06 + i * 0.07} className="min-w-0 flex-1">
                <motion.div
                  animate={{ opacity: active ? 1 : 0.34 }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  <Card
                    accent={highlight === stage.key}
                    className="flex h-full min-h-[560px] flex-col p-8"
                  >
                    <p className="eyebrow-yellow">{stage.eyebrow}</p>

                    <div className="mt-6 grid h-[132px] place-items-center rounded-card bg-dozer-page">
                      <StageArt stage={stage.key} lit={active} />
                    </div>

                    <h3 className="mt-7 text-[26px] font-medium leading-tight text-dozer-heading">
                      {stage.title}
                    </h3>
                    <p className="mt-3 text-[17px] leading-relaxed text-dozer-body">
                      {stage.body}
                    </p>

                    {/* The detail list only appears on the step that is about
                        this stage. On the overview step all three read as
                        equals, which is what makes the overview an overview. */}
                    <motion.ul
                      initial={false}
                      animate={{
                        opacity: highlight === stage.key ? 1 : 0,
                        height: highlight === stage.key ? 'auto' : 0,
                      }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-6 space-y-3 overflow-hidden"
                    >
                      {stage.detail.map((d) => (
                        <li key={d} className="flex gap-3.5">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-dozer-yellow" />
                          <span className="text-[15.5px] leading-relaxed text-dozer-body">{d}</span>
                        </li>
                      ))}
                    </motion.ul>
                  </Card>
                </motion.div>
              </Reveal>

              {i < STAGES.length - 1 && (
                <Connector
                  label={i === 0 ? 'On-machine' : 'After the fact'}
                  emphasis={i === 0}
                  delay={0.12 + i * 0.07}
                />
              )}
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}

/**
 * The gap between two stages. The first one is labelled "On-machine" and drawn
 * solid because that link is the real-time alert path; the second is dashed
 * because reporting is allowed to be asynchronous.
 */
function Connector({
  label,
  emphasis,
  delay,
}: {
  label: string;
  emphasis: boolean;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="flex w-[132px] shrink-0 flex-col items-center justify-center">
      <p className="mb-3 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-eyebrow text-dozer-muted">
        {label}
      </p>
      <svg width="86" height="14" viewBox="0 0 86 14" fill="none" aria-hidden>
        <path
          d="M2 7 H72"
          stroke={emphasis ? '#fdac13' : '#a7aab1'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={emphasis ? undefined : '3 5'}
        />
        <path
          d="M70 2.5 L78 7 L70 11.5 Z"
          fill={emphasis ? '#fdac13' : '#a7aab1'}
        />
      </svg>
    </Reveal>
  );
}

/* ── Stage artwork ───────────────────────────────────────────────────────────
 * Small line drawings rather than icons from a set. They are drawn at the same
 * weight as the 1px borders elsewhere so they sit in the design rather than on
 * top of it.
 */
function StageArt({ stage, lit }: { stage: Stage; lit: boolean }) {
  const line = '#4d5260';
  const accent = lit ? '#fdac13' : '#a7aab1';

  if (stage === 'machine') {
    /*
     * Redrawn. The previous version was a box on tracks with a thin line for a
     * boom and camera dots scattered over it, joined by dashes that read as
     * noise rather than as sight lines — at plate size you could not tell what
     * it was a picture of.
     *
     * Three things fixed. The machine is drawn as a recognisable excavator
     * (tracks, house, cab, boom, stick, bucket) so it reads as heavy equipment
     * at a glance. The cameras are the only accented element, because they are
     * what the plate is about. And their coverage splays OUTWARD onto a ground
     * line rather than arcing over the roof — that is where it actually falls,
     * and it stops the cones cutting across the machine body.
     */
    return (
      <svg width="200" height="96" viewBox="0 0 200 96" fill="none" aria-hidden>
        <g
          stroke={line}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Ground the cameras cover */}
          <path d="M31 39 L3 85 H45 Z" fill={accent} fillOpacity="0.15" stroke={accent} strokeDasharray="3 3.5" />
          <path d="M104 39 L99 85 H147 Z" fill={accent} fillOpacity="0.15" stroke={accent} strokeDasharray="3 3.5" />
          <path d="M2 85 H168" stroke="#a7aab1" strokeWidth="1.2" />

          {/* Tracks, house, cab */}
          <rect x="26" y="59" width="88" height="16" rx="8" />
          <circle cx="40" cy="67" r="2.2" fill={line} stroke="none" />
          <circle cx="100" cy="67" r="2.2" fill={line} stroke="none" />
          <path d="M32 59 V41 H104 V59" />
          <path d="M44 41 V25 H70 V41" />
          <path d="M48 29 H66 V38 H48 Z" stroke="#a7aab1" />

          {/* Boom, stick, bucket */}
          <path d="M104 46 L134 19" />
          <path d="M134 19 L151 40" />
          <path d="M151 40 L161 44 L157 54 L147 50 Z" />

          {/* The cameras */}
          <g fill={accent} stroke={accent}>
            <rect x="27" y="35" width="7.5" height="6" rx="1.8" />
            <rect x="53" y="20" width="7.5" height="6" rx="1.8" />
            <rect x="101" y="35" width="7.5" height="6" rx="1.8" />
          </g>
        </g>
      </svg>
    );
  }

  if (stage === 'cab') {
    return (
      <svg width="200" height="96" viewBox="0 0 200 96" fill="none" aria-hidden>
        {/* Screen */}
        <rect x="52" y="18" width="96" height="60" rx="6" stroke={line} strokeWidth="1.6" />
        <path d="M52 64 H148" stroke={line} strokeWidth="1.2" />
        {/* Alert */}
        <circle cx="100" cy="43" r="15" stroke={accent} strokeWidth="2" />
        <path d="M100 35 V45" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="100" cy="50.5" r="1.5" fill={accent} />
        {/* Emitted rings */}
        <path d="M129 30 A 22 22 0 0 1 129 56" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M71 30 A 22 22 0 0 0 71 56" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg width="200" height="96" viewBox="0 0 200 96" fill="none" aria-hidden>
      {/* Dashboard window */}
      <rect x="40" y="16" width="120" height="64" rx="6" stroke={line} strokeWidth="1.6" />
      <path d="M40 30 H160" stroke={line} strokeWidth="1.2" />
      {/* Bars */}
      <rect x="54" y="56" width="10" height="14" rx="2" fill={line} opacity="0.35" />
      <rect x="70" y="48" width="10" height="22" rx="2" fill={line} opacity="0.35" />
      <rect x="86" y="52" width="10" height="18" rx="2" fill={accent} />
      <rect x="102" y="42" width="10" height="28" rx="2" fill={line} opacity="0.35" />
      <rect x="118" y="46" width="10" height="24" rx="2" fill={line} opacity="0.35" />
      {/* Report line */}
      <path d="M54 38 H108" stroke={line} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M114 38 H132" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
