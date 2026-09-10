'use client';

/**
 * Everything that floats over the slide: the progress bar, the chapter overview
 * grid, the help card, the blank screen and the laser dot.
 *
 * The laser is the one exception to living inside the stage. It follows the real
 * cursor, so it is positioned in viewport pixels and rendered outside the
 * scaled container — putting it inside would mean dividing every mouse
 * coordinate by the stage scale to make the dot land under the pointer.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CHAPTERS, STEPS, TOTAL_STEPS, formatClock } from '@/lib/deck';
import { useDeckStore } from '@/lib/deckStore';

/* ── Progress bar and chapter label ──────────────────────────────────────── */

export function ProgressRail({ index }: { index: number }) {
  const step = STEPS[index];
  const progress = TOTAL_STEPS < 2 ? 1 : index / (TOTAL_STEPS - 1);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
      <div className="flex items-end justify-between px-14 pb-5">
        <p className="eyebrow">
          <span className="text-dozer-muted">{String(step.chapterIndex + 1).padStart(2, '0')}</span>
          <span className="mx-2 text-dozer-muted/60">/</span>
          <span>{step.chapterTitle}</span>
        </p>
        <p className="font-mono text-[13px] tracking-eyebrow text-dozer-muted">
          {String(index + 1).padStart(2, '0')}
          <span className="mx-1 text-dozer-muted/60">—</span>
          {TOTAL_STEPS}
        </p>
      </div>
      {/* Thin rail. Yellow is an accent here, not a fill: it marks how far in
          they are, against a hairline that spans the stage. */}
      <div className="h-[3px] w-full bg-dozer-muted/25">
        <motion.div
          className="h-full bg-dozer-yellow"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 260, damping: 34 }}
        />
      </div>
    </div>
  );
}

/* ── Blank (B) ───────────────────────────────────────────────────────────── */

export function BlankScreen({ on }: { on: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className="absolute inset-0 z-40 grid place-items-center bg-dozer-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          {/* Enough to tell a rep who has forgotten the deck is blanked, small
              enough that a prospect reads it as an intentional pause. */}
          <p className="eyebrow text-dozer-muted/60">Press B to return</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Laser (L) ───────────────────────────────────────────────────────────── */

export function LaserDot({ on }: { on: boolean }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!on) {
      setPos(null);
      return;
    }
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [on]);

  useEffect(() => {
    // Hiding the system cursor is what makes it read as a laser rather than as
    // a dot trailing an arrow.
    document.body.style.cursor = on ? 'none' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [on]);

  if (!on || !pos) return null;

  return (
    <div
      className="pointer-events-none fixed z-[60] h-3 w-3 rounded-full bg-dozer-yellow shadow-laser"
      style={{ left: pos.x - 6, top: pos.y - 6 }}
      aria-hidden
    />
  );
}

/* ── Chapter overview (Esc) ──────────────────────────────────────────────── */

export function ChapterOverview({ on }: { on: boolean }) {
  const index = useDeckStore((s) => s.index);
  const setIndex = useDeckStore((s) => s.setIndex);
  const current = STEPS[index];

  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className="absolute inset-0 z-50 bg-dozer-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          <div className="flex h-full flex-col px-14 py-12">
            <div className="mb-8 flex items-baseline justify-between">
              <p className="eyebrow-yellow">Chapters</p>
              <p className="eyebrow text-dozer-muted">
                Press a number to jump · Esc to close
              </p>
            </div>

            <div className="grid flex-1 grid-cols-4 content-center gap-5">
              {CHAPTERS.map((chapter) => {
                const active = chapter.index === current.chapterIndex;
                return (
                  <button
                    key={chapter.slug}
                    type="button"
                    onClick={() => setIndex(chapter.firstStepIndex)}
                    className={[
                      'group flex h-[228px] flex-col rounded-card border p-5 text-left transition-colors',
                      active
                        ? 'border-dozer-yellow bg-dozer-card'
                        : 'border-dozer-muted/40 bg-dozer-card hover:border-dozer-muted',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className={[
                          'font-mono text-[20px] tabular-nums',
                          active ? 'text-dozer-yellow' : 'text-dozer-muted',
                        ].join(' ')}
                      >
                        {chapter.index + 1}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-eyebrow text-dozer-muted">
                        {formatClock(chapter.seconds)}
                      </span>
                    </div>

                    <h3 className="mt-2 text-[19px] font-medium leading-tight text-dozer-heading">
                      {chapter.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-snug text-dozer-body">
                      {chapter.summary}
                    </p>

                    {/* Step ticks. The filled one is where the deck is now, so a
                        rep glancing at the grid can see their position without
                        reading anything. */}
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                      {chapter.steps.map((s) => (
                        <span
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIndex(s.index);
                          }}
                          title={s.title}
                          className={[
                            'h-1.5 w-6 rounded-full transition-colors',
                            s.index === index
                              ? 'bg-dozer-yellow'
                              : s.index < index
                                ? 'bg-dozer-muted'
                                : 'bg-dozer-muted/35',
                          ].join(' ')}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Help (?) ────────────────────────────────────────────────────────────── */

const KEYS: [string, string][] = [
  ['→  Space  PgDn', 'Next step'],
  ['←  PgUp', 'Previous step'],
  ['1 – 8', 'Jump to chapter'],
  ['F', 'Fullscreen'],
  ['Esc', 'Chapter overview'],
  ['P', 'Presenter view'],
  ['L', 'Laser pointer'],
  ['B', 'Blank the screen'],
  ['I', 'Interact with the module'],
  ['?', 'This list'],
];

export function HelpOverlay({ on }: { on: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className="absolute inset-0 z-50 grid place-items-center bg-dozer-heading/25"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          <motion.div
            className="w-[620px] rounded-card border border-dozer-muted/40 bg-dozer-card p-9 shadow-callout"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <p className="eyebrow-yellow">Keyboard</p>
            <h2 className="mt-2 text-[26px] font-medium text-dozer-heading">
              Driving the deck
            </h2>

            <dl className="mt-7 space-y-0">
              {KEYS.map(([key, label], i) => (
                <div
                  key={key}
                  className={[
                    'flex items-baseline justify-between py-2.5',
                    i > 0 ? 'border-t border-dozer-muted/25' : '',
                  ].join(' ')}
                >
                  <dt className="font-mono text-[13px] tracking-wide text-dozer-heading">{key}</dt>
                  <dd className="text-[14px] text-dozer-body">{label}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-[12.5px] leading-relaxed text-dozer-muted">
              A presentation clicker sends PageUp and PageDown, so it drives the deck
              with no setup. Those two keys keep working in interact mode.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Interact badge (I) ──────────────────────────────────────────────────── */

export function InteractBadge({ on, available }: { on: boolean; available: boolean }) {
  return (
    <AnimatePresence>
      {available && (
        <motion.div
          className="absolute right-14 top-8 z-30"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className={[
              'flex items-center gap-2.5 rounded-card border px-3.5 py-2 transition-colors',
              on
                ? 'border-dozer-yellow bg-dozer-yellow/10'
                : 'border-dozer-muted/40 bg-dozer-card',
            ].join(' ')}
          >
            <span
              className={[
                'h-1.5 w-1.5 rounded-full',
                on ? 'animate-pulse bg-dozer-yellow' : 'bg-dozer-muted',
              ].join(' ')}
            />
            <span className="font-mono text-[11px] uppercase tracking-eyebrow text-dozer-heading">
              {on ? 'Interactive — arrows drive the module' : 'Press I to interact'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
