'use client';

/**
 * Presenter view. Opens in its own window with P and drives the stage over the
 * same BroadcastChannel the stage listens on, so arrows work from either window.
 *
 * What a rep actually needs here, in the order they need it: what am I on, what
 * do I say, what is coming next, and am I running long. Everything else is
 * decoration on a screen that gets glanced at for half a second at a time, so
 * the notes are set large and the chrome is kept quiet.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAPTERS,
  STEPS,
  TOTAL_SECONDS,
  TOTAL_STEPS,
  elapsedBudget,
  formatClock,
} from '@/lib/deck';
import { useDeckStore } from '@/lib/deckStore';
import { useDeckKeyboard } from '@/lib/useDeckKeyboard';
import { useDeckSync } from '@/lib/useDeckSync';
import { renderStep } from '@/components/slides/registry';
import { STAGE } from '@/lib/tokens';

export function Presenter() {
  const index = useDeckStore((s) => s.index);
  const setIndex = useDeckStore((s) => s.setIndex);
  const blank = useDeckStore((s) => s.blank);

  useDeckSync(true);
  useDeckKeyboard({ scope: 'presenter' });

  const step = STEPS[index];
  const next = STEPS[index + 1] ?? null;
  const elapsed = useElapsed();

  // The presenter window is an ordinary scrolling document; the global stylesheet
  // locks scrolling for the stage, so this window opts back in.
  useEffect(() => {
    document.body.dataset.scroll = 'true';
    return () => {
      delete document.body.dataset.scroll;
    };
  }, []);

  const budget = elapsedBudget(index);
  const drift = elapsed.seconds - budget;

  return (
    <div className="min-h-screen bg-dozer-page text-dozer-body">
      <div className="mx-auto max-w-[1500px] px-8 py-7">
        {/* ── Header: timer and position ─────────────────────────────────── */}
        <header className="flex items-end justify-between border-b border-dozer-muted/40 pb-5">
          <div>
            <p className="eyebrow-yellow">Presenter view</p>
            <h1 className="mt-1.5 text-[22px] font-medium text-dozer-heading">
              {step.chapterTitle}
              <span className="mx-2.5 text-dozer-muted/60">/</span>
              <span className="font-mono text-[18px] text-dozer-muted">
                step {step.n} of {CHAPTERS[step.chapterIndex].steps.length}
              </span>
            </h1>
          </div>

          <div className="flex items-end gap-8">
            <Timer elapsed={elapsed} drift={drift} />
            <div className="text-right">
              <p className="eyebrow text-dozer-muted">Deck</p>
              <p className="mt-1 font-mono text-[22px] tabular-nums text-dozer-heading">
                {String(index + 1).padStart(2, '0')}
                <span className="mx-1 text-dozer-muted/60">/</span>
                {TOTAL_STEPS}
              </p>
            </div>
          </div>
        </header>

        {blank && (
          <div className="mt-5 rounded-card border border-dozer-yellow bg-dozer-yellow/10 px-5 py-3">
            <p className="font-mono text-[12px] uppercase tracking-eyebrow text-dozer-heading">
              Stage is blanked — press B to bring it back
            </p>
          </div>
        )}

        <div className="mt-7 grid grid-cols-[240px_1fr_460px] gap-7">
          {/* ── Chapter list ─────────────────────────────────────────────── */}
          <nav aria-label="Chapters">
            <p className="eyebrow text-dozer-muted">Chapters</p>
            <ol className="mt-4 space-y-1">
              {CHAPTERS.map((c) => {
                const active = c.index === step.chapterIndex;
                return (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => setIndex(c.firstStepIndex)}
                      className={[
                        'flex w-full items-baseline gap-2.5 rounded px-2.5 py-2 text-left transition-colors',
                        active ? 'bg-dozer-card' : 'hover:bg-dozer-card/70',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'font-mono text-[13px] tabular-nums',
                          active ? 'text-dozer-yellow' : 'text-dozer-muted',
                        ].join(' ')}
                      >
                        {c.index + 1}
                      </span>
                      <span
                        className={[
                          'text-[14px] leading-snug',
                          active ? 'font-medium text-dozer-heading' : 'text-dozer-body',
                        ].join(' ')}
                      >
                        {c.title}
                      </span>
                    </button>

                    {active && (
                      <ol className="mb-1.5 ml-7 mt-0.5 space-y-0.5">
                        {c.steps.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => setIndex(s.index)}
                              className={[
                                'w-full rounded px-2 py-1 text-left text-[12.5px] leading-snug transition-colors',
                                s.index === index
                                  ? 'font-medium text-dozer-heading'
                                  : 'text-dozer-muted hover:text-dozer-body',
                              ].join(' ')}
                            >
                              <span className="mr-2 font-mono text-[11px]">{s.n}</span>
                              {s.title}
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* ── Notes ───────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-dozer-muted">On screen now</p>
              {step.interactive && (
                <span className="rounded-card border border-dozer-yellow px-2.5 py-1 font-mono text-[10px] uppercase tracking-eyebrow text-dozer-heading">
                  Press I on the stage
                </span>
              )}
            </div>

            <h2 className="mt-3 text-[30px] font-medium leading-tight text-dozer-heading">
              {step.title}
            </h2>

            <div className="mt-6 space-y-4 rounded-card border border-dozer-muted/40 bg-dozer-card p-7">
              {step.notes.map((n, i) => (
                <p
                  key={i}
                  className={[
                    'text-[17px] leading-relaxed',
                    // Notes that open with a warning glyph are things the rep
                    // must not skim past, so they are not styled like prose.
                    n.startsWith('⚠')
                      ? 'rounded border-l-2 border-dozer-yellow bg-dozer-yellow/10 py-2.5 pl-4 pr-3 font-medium text-dozer-heading'
                      : 'text-dozer-body',
                  ].join(' ')}
                >
                  {n}
                </p>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <NavButton onClick={() => setIndex(index - 1)} disabled={index === 0}>
                ← Previous
              </NavButton>
              <NavButton onClick={() => setIndex(index + 1)} disabled={index >= TOTAL_STEPS - 1}>
                Next →
              </NavButton>
              <p className="ml-auto font-mono text-[11px] uppercase tracking-eyebrow text-dozer-muted">
                ~{formatClock(step.seconds)} on this step
              </p>
            </div>
          </section>

          {/* ── Next-step preview ───────────────────────────────────────── */}
          <aside>
            <p className="eyebrow text-dozer-muted">Next</p>
            {next ? (
              <>
                <div className="mt-4 overflow-hidden rounded-card border border-dozer-muted/40 bg-dozer-card">
                  <Thumbnail>{renderStep(next, { preview: true })}</Thumbnail>
                </div>
                <h3 className="mt-4 text-[17px] font-medium leading-snug text-dozer-heading">
                  {next.title}
                </h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-eyebrow text-dozer-muted">
                  {next.chapterTitle} · step {next.n}
                </p>
                {next.notes[0] && (
                  <p className="mt-4 text-[14px] leading-relaxed text-dozer-body">
                    {next.notes[0]}
                  </p>
                )}
              </>
            ) : (
              <div className="mt-4 grid h-[240px] place-items-center rounded-card border border-dashed border-dozer-muted/50">
                <p className="eyebrow text-dozer-muted">End of deck</p>
              </div>
            )}

            <p className="mt-8 border-t border-dozer-muted/40 pt-5 font-mono text-[11px] leading-relaxed tracking-wide text-dozer-muted">
              Budget for the whole deck is {formatClock(TOTAL_SECONDS)}. Arrows and a clicker
              drive the stage from this window too.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a real slide at thumbnail size using the same fixed-canvas-plus-scale
 * trick as the stage, so the preview is the actual next slide rather than a
 * separate mock that can drift out of date.
 */
function Thumbnail({ children }: { children: React.ReactNode }) {
  const width = 458;
  const scale = width / STAGE.width;

  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height: STAGE.height * scale }}
      aria-hidden
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-card border border-dozer-muted/50 bg-dozer-card px-4 py-2 text-[14px] text-dozer-body transition-colors hover:border-dozer-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ── Timer ───────────────────────────────────────────────────────────────── */

interface Elapsed {
  seconds: number;
  running: boolean;
  reset: () => void;
  toggle: () => void;
}

function useElapsed(): Elapsed {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const startRef = useRef(Date.now());
  const bankedRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const id = window.setInterval(() => {
      setSeconds(bankedRef.current + Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = useCallback(() => {
    setRunning((r) => {
      if (r) bankedRef.current += Math.floor((Date.now() - startRef.current) / 1000);
      return !r;
    });
  }, []);

  const reset = useCallback(() => {
    bankedRef.current = 0;
    startRef.current = Date.now();
    setSeconds(0);
  }, []);

  return { seconds, running, reset, toggle };
}

function Timer({ elapsed, drift }: { elapsed: Elapsed; drift: number }) {
  /* Drift is elapsed against the pacing budget for the steps covered so far. It
     is deliberately not an alarm — no colour change until a full minute over, so
     a rep who spent an extra twenty seconds on a good question does not get
     nagged for it mid-answer. */
  const late = drift > 60;
  const early = drift < -60;

  return (
    <div className="text-right">
      <p className="eyebrow text-dozer-muted">Elapsed</p>
      <div className="mt-1 flex items-baseline justify-end gap-3">
        <span className="font-mono text-[30px] leading-none tabular-nums text-dozer-heading">
          {formatClock(elapsed.seconds)}
        </span>
        <span
          className={[
            'font-mono text-[13px] tabular-nums',
            late ? 'text-dash-negative' : early ? 'text-dozer-muted' : 'text-dash-positive',
          ].join(' ')}
        >
          {drift >= 0 ? '+' : '−'}
          {formatClock(Math.abs(drift))}
        </span>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={elapsed.toggle}
          className="rounded border border-dozer-muted/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-eyebrow text-dozer-body transition-colors hover:border-dozer-muted"
        >
          {elapsed.running ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          onClick={elapsed.reset}
          className="rounded border border-dozer-muted/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-eyebrow text-dozer-body transition-colors hover:border-dozer-muted"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
