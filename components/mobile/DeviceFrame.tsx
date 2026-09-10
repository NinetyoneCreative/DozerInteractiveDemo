'use client';

/**
 * The tablet body the in-cab display sits in.
 *
 * Replaces an earlier portrait phone frame written before the recording was in
 * hand. The recording turned out to be the in-cab operator display — 1200x720,
 * landscape, with an OS home indicator along the bottom edge — so the frame is
 * a landscape tablet and the aspect is a prop rather than a constant.
 *
 * Deliberately generic hardware. The point of the frame is to say "this runs on
 * a screen in the cab" and then get out of the way of the recording, and
 * shipping a recognisable trade-dress lookalike in a sales deck is a needless
 * thing to do.
 */

/** The in-cab display's own aspect. Measured off the recording: 1200x720. */
export const IN_CAB_ASPECT = 1200 / 720;

export function DeviceFrame({
  screenHeight,
  aspect = IN_CAB_ASPECT,
  children,
  className = '',
}: {
  screenHeight: number;
  /** Screen width / height. */
  aspect?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const screenWidth = screenHeight * aspect;

  /* Bezel and radius scale with the device, so the frame reads the same at any
     size instead of turning into a thick black slab when the screen is small. */
  const bezel = Math.round(screenHeight * 0.022);
  const bodyRadius = Math.round(screenHeight * 0.038);
  const screenRadius = Math.max(2, bodyRadius - bezel);

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{
        width: screenWidth + bezel * 2,
        height: screenHeight + bezel * 2,
        padding: bezel,
        borderRadius: bodyRadius,
        background: '#14161d',
        // A shadow here is not decoration: a device genuinely sits above the
        // page, and without one the body reads as a flat black rectangle
        // somebody drew rather than as hardware.
        boxShadow:
          '0 28px 56px -18px rgba(77, 82, 96, 0.38), 0 4px 14px -4px rgba(77, 82, 96, 0.22)',
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ borderRadius: screenRadius, background: '#242331' }}
      >
        {children}
      </div>
    </div>
  );
}
