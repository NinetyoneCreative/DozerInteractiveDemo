'use client';

/**
 * Deck navigation state.
 *
 * Two windows can be driving the same deck at once — the stage the prospect sees
 * and the presenter view on the rep's laptop — so position cannot live in a
 * component. It lives here, and lib/useDeckSync.ts keeps the two copies in step
 * over a BroadcastChannel.
 *
 * Overlay flags are deliberately separate booleans rather than one `mode` enum.
 * A rep with the laser on who hits Esc for the overview expects the laser to
 * still be there when they come back, and a single mode would have thrown it
 * away.
 */

import { create } from 'zustand';
import { CHAPTERS, TOTAL_STEPS, clampIndex } from './deck';

/** Where a change came from, so the sync layer does not echo it back. */
export type NavSource = 'local' | 'remote' | 'hash';

interface DeckState {
  index: number;
  /** Bumped on every set so the sync layer can tell a real change from a re-render. */
  epoch: number;
  lastSource: NavSource;

  /** Esc — the chapter overview grid. */
  overview: boolean;
  /** ? — the keyboard help card. */
  help: boolean;
  /** B — blank the stage to the page background. */
  blank: boolean;
  /** L — yellow laser dot follows the cursor. */
  laser: boolean;
  /**
   * I — the embedded module owns the keyboard. Arrow keys stop advancing the
   * deck, because on the 3D chapter they orbit the scene instead.
   */
  interact: boolean;

  setIndex: (index: number, source?: NavSource) => void;
  next: () => void;
  prev: () => void;
  gotoChapter: (chapterIndex: number) => void;

  toggleOverview: () => void;
  toggleHelp: () => void;
  toggleBlank: () => void;
  toggleLaser: () => void;
  toggleInteract: () => void;
  /** Esc with nothing open, or any navigation: drop every transient overlay. */
  closeOverlays: () => void;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  index: 0,
  epoch: 0,
  lastSource: 'local',

  overview: false,
  help: false,
  blank: false,
  laser: false,
  interact: false,

  setIndex: (index, source = 'local') =>
    set((s) => {
      const next = clampIndex(index);
      if (next === s.index && source !== 'hash') return s;
      return {
        index: next,
        epoch: s.epoch + 1,
        lastSource: source,
        // Moving to another step closes the overview and hands the keyboard
        // back to the deck. Blank and laser are the rep's own state and survive.
        overview: false,
        help: false,
        interact: next === s.index ? s.interact : false,
      };
    }),

  next: () => {
    const { index, setIndex } = get();
    if (index < TOTAL_STEPS - 1) setIndex(index + 1, 'local');
  },

  prev: () => {
    const { index, setIndex } = get();
    if (index > 0) setIndex(index - 1, 'local');
  },

  gotoChapter: (chapterIndex) => {
    const chapter = CHAPTERS[chapterIndex];
    if (chapter) get().setIndex(chapter.firstStepIndex, 'local');
  },

  toggleOverview: () => set((s) => ({ overview: !s.overview, help: false })),
  toggleHelp: () => set((s) => ({ help: !s.help, overview: false })),
  toggleBlank: () => set((s) => ({ blank: !s.blank })),
  toggleLaser: () => set((s) => ({ laser: !s.laser })),
  toggleInteract: () => set((s) => ({ interact: !s.interact, overview: false, help: false })),

  closeOverlays: () => set({ overview: false, help: false }),
}));
