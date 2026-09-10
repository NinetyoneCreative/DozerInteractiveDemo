'use client';

/**
 * One looping screen-recording clip.
 *
 * The fiddly parts of putting autoplaying video on a shared screen, all in one
 * place:
 *
 * • `muted` + `playsInline` are not optional. Without both, Safari and Chrome
 *   refuse to autoplay and the rep gets a frozen first frame with a play button
 *   over it in front of a prospect.
 *
 * • `play()` returns a promise that REJECTS under autoplay policy. Unhandled,
 *   that is an uncaught rejection in the console on every step change; handled,
 *   we can fall back to the poster instead of pretending it worked.
 *
 * • Clips only mount while their step is on screen. A chapter with six
 *   recordings would otherwise have six video elements decoding at once on a
 *   laptop that is also running WebGL and screen-sharing.
 *
 * • Coming back to a step restarts the clip. A rep who returns to a slide to
 *   re-make a point wants the motion from the top, not wherever it happened to
 *   be looping.
 *
 * • Under `prefers-reduced-motion` nothing autoplays; the poster shows with a
 *   control to start it deliberately.
 *
 * Two sources are emitted: WebM/VP9 first for the browsers that take it, MP4/
 * H.264 behind it as the universal fallback. Both are produced by
 * scripts/make-clips.mjs.
 */

import { useEffect, useRef, useState } from 'react';

export interface ClipProps {
  /**
   * Basename in /public/clips, without extension. `make-clips.mjs` emits
   * `<name>.webm`, `<name>.mp4` and `<name>.jpg` for each entry.
   */
  name: string;
  /** What the clip shows, for screen readers and for the no-motion fallback. */
  label: string;
  /** Whether this clip's step is currently on screen. */
  active: boolean;
  className?: string;
}

export function Clip({ name, label, active, className = '' }: ClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);

  const poster = `/clips/${name}.jpg`;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !active || reduced) return;
    el.currentTime = 0;
    // Rejects under autoplay policy. Fall back to the poster rather than
    // leaving an uncaught rejection behind on every step change.
    void el.play().catch(() => setFailed(true));
  }, [active, reduced, name]);

  // Not mounted at all while off screen — see the note above about six decoders.
  if (!active) {
    return <PosterOnly poster={poster} label={label} className={className} />;
  }

  if (reduced || failed) {
    return (
      <PosterOnly
        poster={poster}
        label={label}
        className={className}
        onPlay={
          failed
            ? () => {
                setFailed(false);
                void videoRef.current?.play().catch(() => setFailed(true));
              }
            : undefined
        }
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className={`h-full w-full object-cover ${className}`}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-label={label}
      onError={() => setFailed(true)}
    >
      <source src={`/clips/${name}.webm`} type="video/webm" />
      <source src={`/clips/${name}.mp4`} type="video/mp4" />
    </video>
  );
}

function PosterOnly({
  poster,
  label,
  className,
  onPlay,
}: {
  poster: string;
  label: string;
  className?: string;
  onPlay?: () => void;
}) {
  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt={label} className="h-full w-full object-cover" />
      {onPlay && (
        <button
          type="button"
          onClick={onPlay}
          className="absolute inset-0 grid place-items-center bg-black/25"
          aria-label={`Play: ${label}`}
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-dozer-card/95">
            <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden>
              <path d="M2 2 L18 11 L2 20 Z" fill="#4d5260" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
