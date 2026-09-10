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
