'use client';

/**
 * The stage: one slide at a time, the overlays over it, and the keyboard.
 *
 * This is the only place that wires navigation to rendering. Everything it uses
 * lives somewhere more testable — the script in lib/deck.ts, position in
 * lib/deckStore.ts, the key map in lib/useDeckKeyboard.ts, cross-window sync in
 * lib/useDeckSync.ts.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { STEPS } from '@/lib/deck';
import { useDeckStore } from '@/lib/deckStore';
import { useDeckKeyboard } from '@/lib/useDeckKeyboard';
import { useDeckSync } from '@/lib/useDeckSync';
import { isInteractive, renderStep, slideKey } from '@/components/slides/registry';
import {
  BlankScreen,
  ChapterOverview,
  HelpOverlay,
  InteractBadge,
  LaserDot,
  ProgressRail,
} from './Overlays';
import { Stage, useFullscreen } from './Stage';

/**
 * Pull the 3D module's code and its two GLBs into cache while the rep is still
 * on the opening chapter.
 *
 * The module preloads its own machines, but only once it has already mounted —
 * which is too late to help the first time it is opened. Cold, the coverage
 * chapter took ~3.6s to go from a keypress to a scene with a number on it, and
 * that gap used to be hidden behind a text slide before it. With that slide gone
 * the gap would be in front of the prospect, so it is closed properly instead.
 *
 * On idle, and once: this must never compete with rendering the slide the rep is
 * actually looking at.
 */
function useWarmCoverageModule() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const warm = () => {
      // The chunk first — it carries three.js, which is the larger half of the
      // wait — then the machines it will ask for.
      void import('@/components/camera-coverage/Machine')
        .then(({ preloadMachines }) => preloadMachines())
        .catch(() => {
          // A deck that cannot prefetch still works; it is just slower on the
          // first open. Nothing to report to the rep mid-presentation.
        });
    };

    const ric = (window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (ric) {
      ric(warm, { timeout: 4000 });
    } else {
      // Safari has no requestIdleCallback. A timeout is long enough to be after
      // the first paint and short enough to be done before anyone reaches
      // chapter 3.
      window.setTimeout(warm, 2500);
    }
  }, []);
}

export function Deck() {
  const index = useDeckStore((s) => s.index);
  const overview = useDeckStore((s) => s.overview);
  const help = useDeckStore((s) => s.help);
  const blank = useDeckStore((s) => s.blank);
  const laser = useDeckStore((s) => s.laser);
  const interact = useDeckStore((s) => s.interact);

  const fullscreen = useFullscreen();
  useDeckSync(true);
  useDeckKeyboard({ scope: 'stage', onFullscreen: fullscreen.toggle });

  const step = STEPS[index];
  const interactive = isInteractive(step);
  const slideRef = useRef<HTMLDivElement>(null);

  useWarmCoverageModule();

  /* Interact mode has to actually move focus, or the 3D module's own key
     handlers never fire — it listens on its canvas, not on the window. Focusing
     the canvas is what makes the arrow keys orbit rather than doing nothing. */
  useEffect(() => {
    if (!interact) {
      // Give focus back to the document so the deck's own keys are unambiguous.
      (document.activeElement as HTMLElement | null)?.blur?.();
      return;
    }
    const target =
      slideRef.current?.querySelector('canvas') ??
      slideRef.current?.querySelector<HTMLElement>('[tabindex], button, input');
    (target as HTMLElement | null)?.focus?.();
  }, [interact, index]);

  return (
    <>
      <Stage>
        <div className="relative h-full w-full overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={slideKey(step)}
              ref={slideRef}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              // Short. A rep should never be waiting on the deck to catch up,
              // and anything slower reads as hesitation on a shared screen.
              transition={{ duration: 0.16, ease: 'linear' }}
            >
              {renderStep(step, { interact })}
            </motion.div>
          </AnimatePresence>

          <InteractBadge on={interact} available={interactive} />
          <ProgressRail index={index} />

          <BlankScreen on={blank} />
          <ChapterOverview on={overview} />
          <HelpOverlay on={help} />

          {/* First step only. Every other slide puts its eyebrow in this exact
              corner, and a permanent hint sitting on top of it was the first
              thing you noticed on every screenshot. The rep needs this once, on
              the way in — and the cover slide is where they are standing while
              the room fills up. */}
          {index === 0 && fullscreen.supported && !fullscreen.active && !blank && (
            <p className="pointer-events-none absolute right-14 top-8 z-20 font-mono text-[11px] uppercase tracking-eyebrow text-dozer-muted/70">
              F for fullscreen · ? for keys
            </p>
          )}
        </div>
      </Stage>

      {/* Outside the stage: the dot follows real viewport pixels, so putting it
          inside the scaled container would mean dividing every coordinate by the
          stage scale to make it land under the pointer. */}
      <LaserDot on={laser} />
    </>
  );
}
