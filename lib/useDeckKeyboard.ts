'use client';

/**
 * The keyboard map.
 *
 *   → / Space / PageDown   next step
 *   ← / PageUp             previous step
 *   1–8                    jump to chapter
 *   F                      fullscreen
 *   Esc                    chapter overview grid (or close whatever is open)
 *   P                      presenter view in a new window
 *   L                      laser pointer
 *   B                      blank to page background
 *   I                      interact mode
 *   ?                      this list
 *
 * Two constraints shape the whole file.
 *
 * PageUp/PageDown are not optional. Presentation clickers send exactly those two
 * keys and nothing else, so they have to advance the deck under every condition
 * a rep can get into — including interact mode and including while a slider
 * inside the 3D module has focus. If those keys stop working the rep is stranded
 * at the lectern with a dead clicker, which is worse than any feature.
 *
 * Interact mode gives the arrow keys away. On the 3D chapter the arrows orbit
 * the scene, so the deck must not also advance on them. Everything else stays.
 */

import { useEffect } from 'react';
import { CHAPTERS } from './deck';
import { useDeckStore } from './deckStore';

/** Keys a clicker sends. These work no matter what else is going on. */
const CLICKER_NEXT = new Set(['PageDown']);
const CLICKER_PREV = new Set(['PageUp']);

function isFormControl(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'SELECT' ||
    tag === 'TEXTAREA' ||
    tag === 'BUTTON' ||
    el.isContentEditable
  );
}

export interface KeyboardOptions {
  /**
   * The presenter window gets navigation and blank, but not fullscreen, laser,
   * interact or another presenter window — those all act on the stage, and a
   * second presenter window opening itself is nobody's idea of a good time.
   */
  scope?: 'stage' | 'presenter';
  /** Called for F. The stage passes its own fullscreen handler. */
  onFullscreen?: () => void;
}

export function useDeckKeyboard({ scope = 'stage', onFullscreen }: KeyboardOptions = {}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const store = useDeckStore.getState();
      const inControl = isFormControl(e.target);

      // ── Clicker keys: always, unconditionally ─────────────────────────────
      if (CLICKER_NEXT.has(e.key)) {
        e.preventDefault();
        store.next();
        return;
      }
      if (CLICKER_PREV.has(e.key)) {
        e.preventDefault();
        store.prev();
        return;
      }

      // ── Escape: closes the innermost thing that is open ───────────────────
      if (e.key === 'Escape') {
        e.preventDefault();
        if (store.help) store.toggleHelp();
        else if (store.blank) store.toggleBlank();
        else if (store.interact) store.toggleInteract();
        else store.toggleOverview();
        return;
      }

      // A slider inside the 3D module owns its own arrows and digits. Past this
      // point we are competing with a focused control, so stand down.
      if (inControl) return;

      // ── Navigation ────────────────────────────────────────────────────────
      // In interact mode the arrows belong to the embedded module. Space still
      // advances: nothing embedded uses it, and it is the key reps reach for.
      const arrowsAreOurs = !store.interact;

      if ((e.key === 'ArrowRight' && arrowsAreOurs) || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        store.next();
        return;
      }
      if (e.key === 'ArrowLeft' && arrowsAreOurs) {
        e.preventDefault();
        store.prev();
        return;
      }

      // ── Chapter jumps ─────────────────────────────────────────────────────
      if (/^[1-9]$/.test(e.key)) {
        const chapterIndex = Number(e.key) - 1;
        if (chapterIndex < CHAPTERS.length) {
          e.preventDefault();
          store.gotoChapter(chapterIndex);
        }
        return;
      }

      // ── Overlays and modes ────────────────────────────────────────────────
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          store.toggleBlank();
          return;
        case '?':
          e.preventDefault();
          store.toggleHelp();
          return;
      }
      // '?' is Shift+/ on most layouts; some report the key as '/'.
      if (e.key === '/' && e.shiftKey) {
        e.preventDefault();
        store.toggleHelp();
        return;
      }

      if (scope !== 'stage') return;

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          onFullscreen?.();
          return;
        case 'l':
          e.preventDefault();
          store.toggleLaser();
          return;
        case 'i':
          e.preventDefault();
          store.toggleInteract();
          return;
        case 'p':
          e.preventDefault();
          openPresenter();
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scope, onFullscreen]);
}

/**
 * Opens the presenter view beside the stage.
 *
 * The named window means pressing P twice focuses the window that is already
 * open rather than stacking a second one — reps press P again when they cannot
 * find the window behind the screen-share, not because they want two.
 */
export function openPresenter() {
  const base = window.location.pathname.replace(/\/$/, '');
  const url = `${base}/presenter/${window.location.hash}`;
  const w = window.open(url, 'dozer-presenter', 'width=1180,height=860,noopener=no');
  w?.focus();
}
