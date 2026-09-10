'use client';

/**
 * The fixed 16:9 stage.
 *
 * Everything inside is authored at exactly 1920×1080 and the whole thing is
 * scaled by a single CSS transform to fit whatever window it lands in, with the
 * page background showing through as letterbox.
 *
 * Scaling rather than reflowing is the point. A screen-shared deck has to look
 * identical at 1920×1080 and at 1440×900, and it has to look identical to the
 * rep and the prospect, whose windows are never the same size. Responsive
 * layout would give everyone a slightly different deck, and a slide the rep
 * rehearsed at one width would break at another. One canvas, one scale factor,
 * no surprises.
 *
 * Consequence worth knowing: a 1px border at 1440×900 renders at 0.75px. That
 * is fine — it is what makes the borders read as hairlines rather than as the
 * chunky 1px they would be if each slide were laid out natively.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { STAGE } from '@/lib/tokens';

export function Stage({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const { innerWidth: w, innerHeight: h } = window;
      setScale(Math.min(w / STAGE.width, h / STAGE.height));
    };
    measure();
    window.addEventListener('resize', measure);
    // Entering and leaving fullscreen does not always fire resize on every
    // browser, and a stage stuck at the old scale after F is very visible.
    document.addEventListener('fullscreenchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      document.removeEventListener('fullscreenchange', measure);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-dozer-page"
    >
      {/*
        Two nested elements, and the split matters.

        The outer one takes the SCALED footprint as its real layout size, so the
        flex centring is centring a box that actually fits the viewport. The
        inner one is the authored 1920x1080 canvas, scaled from its top-left
        corner into that footprint.

        The obvious one-element version — an oversized 1920x1080 box centred by
        the parent and scaled about its own centre — lands correctly at some
        viewport sizes and is off by half the overflow at others, because
        centring an item larger than its container is not something you want to
        be depending on. Scaling from a corner into a correctly-sized box has no
        such ambiguity.
      */}
      <div
        style={{ width: STAGE.width * scale, height: STAGE.height * scale }}
        className="relative shrink-0 overflow-hidden bg-dozer-page"
      >
        <div
          style={{
            width: STAGE.width,
            height: STAGE.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="absolute left-0 top-0 bg-dozer-page"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Fullscreen for the whole document.
 *
 * Returns null where the API is unavailable rather than a toggle that silently
 * does nothing — the stage hides its hint in that case.
 */
export function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled));
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* Stable identity. useDeckKeyboard takes this as a dependency, so a fresh
     closure on every render meant tearing down and re-adding the window keydown
     listener on every single step change — for no reason. */
  const toggle = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => {
        // A browser can refuse without a user gesture it recognises. Nothing to
        // recover here, and throwing an unhandled rejection mid-call helps
        // nobody.
      });
    }
  }, []);

  return { supported, active, toggle };
}
