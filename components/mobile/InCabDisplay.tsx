'use client';

/**
 * The in-cab operator display: the recording, with the deck's own focus
 * treatment laid over it.
 *
 * ── Why one clip and not four ────────────────────────────────────────────────
 * The obvious build is a clip per panel dropped into a rebuilt grid. It does not
 * survive contact with reality: four <video> elements looping independently
 * drift apart within seconds, and the moment they do, the display contradicts
 * itself — the rear feed shows a truck at 2.9m while the plan view beside it
 * reports all clear. On a proximity-detection demo that is the one inconsistency
 * you cannot put on a prospect's screen. One clip, one timeline, always
 * self-consistent.
 *
 * So the panels are walked by dimming the others over the top instead, which is
 * the same treatment the dashboard chapter uses and needs no second asset.
 *
 * ── The rectangles ───────────────────────────────────────────────────────────
 * SECTORS below are measured off the recording, not estimated: the panel edges
 * were found by scanning for the run of pixels that differ from the app's
 * #242331 background. They are stored as fractions of the 1200x720 source so
 * they hold at any rendered size.
 */

import { motion } from 'framer-motion';
import type { Sector } from '@/lib/deck';
import { Clip } from './Clip';

/** Fractions of the 1200x720 source. See the note above. */
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const px = (x: number) => x / 1200;
const py = (y: number) => y / 720;

export const SECTORS: Record<Exclude<Sector, null>, { rect: Rect; label: string }> = {
  // Machine plan view and its proximity arcs, down the left.
  plan: {
    rect: { left: px(4), top: py(48), width: px(358), height: py(650) },
    label: 'Machine plan view and proximity arcs',
  },
  front: {
    rect: { left: px(371), top: py(9), width: px(404), height: py(334) },
    label: 'Front camera',
  },
  right: {
    rect: { left: px(784), top: py(9), width: px(407), height: py(334) },
    label: 'Right camera',
  },
  rear: {
    rect: { left: px(371), top: py(351), width: px(819), height: py(343) },
    label: 'Rear camera',
  },
};

const ORDER: Exclude<Sector, null>[] = ['plan', 'front', 'right', 'rear'];

export function InCabDisplay({ focus, active }: { focus: Sector; active: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#242331]">
      <Clip
        name="in-cab-display"
        label="In-cab operator display: front, right and rear camera feeds with proximity detection"
        active={active}
        className="absolute inset-0"
      />

      {/*
        The dim is four strips tiled AROUND the panel in focus, not a scrim on
        each of the other panels.

        Scrimming the others individually leaves their rectangles visible as
        slightly darker patches against the app's own background wherever they
        do not line up with something — you could see the plan panel's box
        floating in the middle of the screen. Tiling around the subject covers
        every pixel except the one panel at a uniform opacity, so there are no
        internal seams at all, and the strips animate their geometry so the
        spotlight slides from one panel to the next rather than cutting.
      */}
      {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
        <motion.div
          key={`scrim-${side}`}
          className="pointer-events-none absolute bg-[#14161d]"
          initial={false}
          animate={{ ...scrimGeometry(side, focus), opacity: focus ? 0.72 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}

      {/* Ring on the subject. Brand yellow, and the one place it appears over
          the app's own amber — it sits outside the panel edge rather than on
          it, so the two never touch. */}
      {ORDER.map((key) => {
        const { rect } = SECTORS[key];
        const lit = focus === key;
        return (
          <motion.div
            key={`ring-${key}`}
            className="pointer-events-none absolute rounded-[6px] ring-2 ring-dozer-yellow"
            initial={false}
            animate={{ opacity: lit ? 1 : 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              left: `calc(${rect.left * 100}% - 5px)`,
              top: `calc(${rect.top * 100}% - 5px)`,
              width: `calc(${rect.width * 100}% + 10px)`,
              height: `calc(${rect.height * 100}% + 10px)`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Geometry for one of the four strips that surround the focused panel.
 *
 * With no focus the strips still have a sensible box — they are simply at zero
 * opacity — so that focusing a panel animates from somewhere rather than
 * appearing out of nothing.
 */
function scrimGeometry(side: 'top' | 'bottom' | 'left' | 'right', focus: Sector) {
  const r = focus ? SECTORS[focus].rect : { left: 0, top: 0, width: 1, height: 1 };
  const pct = (n: number) => `${n * 100}%`;

  switch (side) {
    case 'top':
      return { left: '0%', top: '0%', width: '100%', height: pct(r.top) };
    case 'bottom':
      return { left: '0%', top: pct(r.top + r.height), width: '100%', height: pct(Math.max(0, 1 - r.top - r.height)) };
    case 'left':
      return { left: '0%', top: pct(r.top), width: pct(r.left), height: pct(r.height) };
    case 'right':
      return { left: pct(r.left + r.width), top: pct(r.top), width: pct(Math.max(0, 1 - r.left - r.width)), height: pct(r.height) };
  }
}
