'use client';

/**
 * Shared slide furniture.
 *
 * Every slide gets the same left margin, the same eyebrow position and the same
 * title scale, so advancing through the deck does not move the reader's eye
 * around the screen. Sizes are absolute pixels because the stage is a fixed
 * 1920×1080 canvas — see components/stage/Stage.tsx.
 */

import { motion } from 'framer-motion';

/** Vertical rhythm shared by every slide. 96px gutters, room for the rail. */
export const GUTTER = 'px-24';

export function SlideFrame({
  eyebrow,
  title,
  children,
  /** Wide slides (the dashboard, the 3D module) want the title compressed. */
  compact = false,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex h-full flex-col ${GUTTER} ${compact ? 'pt-12 pb-16' : 'pt-20 pb-20'}`}>
      <Reveal>
        <p className="eyebrow-yellow">{eyebrow}</p>
        <h1
          className={[
            'mt-3 font-medium leading-[1.08] tracking-[-0.015em] text-dozer-heading',
            compact ? 'text-[42px]' : 'text-[62px]',
          ].join(' ')}
        >
          {title}
        </h1>
      </Reveal>
      {/*
        Compact slides (the dashboard, the 3D module) fill their canvas exactly,
        so the content area is just the remaining box.

        Everything else is shorter than the space it is given, and hanging a
        380px block off the title left a third of the stage empty at the bottom
        of half the deck. Centring what is there reads as a deliberate
        composition rather than as a slide that ran out of content.
      */}
      <div
        className={
          compact
            ? 'mt-7 min-h-0 flex-1'
            : 'mt-12 flex min-h-0 flex-1 flex-col justify-center'
        }
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The one motion primitive in the deck.
 *
 * A short upward fade, and nothing else. Slide transitions on a sales call are
 * a tax on the rep's timing: anything longer than about 200ms means they either
 * talk over the animation or wait for it, and both read as hesitation. Staggered
 * children are worth it for lists — the eye lands on the first item rather than
 * on the whole block at once — but the stagger is small enough not to be
 * something you wait for.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** A card. 1px border, 8px radius, white. No shadow — shadows are for callouts. */
export function Card({
  children,
  className = '',
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-card border bg-dozer-card',
        accent ? 'border-dozer-yellow' : 'border-dozer-muted/40',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/**
 * The floating callout used on the interactive chapters — the one place in the
 * deck that gets a shadow, because it genuinely floats above a live module
 * rather than sitting in the layout.
 */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none flex items-center gap-3 rounded-card border border-dozer-muted/40 bg-dozer-card px-5 py-3 shadow-callout"
    >
      <span className="h-6 w-[3px] shrink-0 rounded-full bg-dozer-yellow" />
      <p className="text-[16px] leading-snug text-dozer-body">{children}</p>
    </motion.div>
  );
}

/** Sample-data marker. Small, permanent, and never in the way. */
export function SampleDataChip({ className = '' }: { className?: string }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-card border border-dozer-muted/40 px-2.5 py-1',
        className,
      ].join(' ')}
    >
      <span className="h-1 w-1 rounded-full bg-dozer-muted" />
      <span className="font-mono text-[10px] uppercase tracking-eyebrow text-dozer-muted">
        Sample data
      </span>
    </span>
  );
}
