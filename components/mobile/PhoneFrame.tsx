'use client';

/**
 * A neutral phone body to sit a screen recording inside.
 *
 * Sized by SCREEN HEIGHT, not width. Everything else on this stage is
 * width-constrained, but a portrait phone on a 16:9 canvas is the opposite —
 * vertical space runs out long before horizontal does, so height is the number
 * worth controlling and the width follows from the aspect ratio.
 *
 * Deliberately generic hardware: a rounded body, a thin bezel and a small
 * island. It is not a copy of any manufacturer's device, because the point of
 * the frame is to say "this is a phone" and then get out of the way of the
 * recording — and because shipping a recognisable trade-dress lookalike in a
 * sales deck is a needless thing to do.
 */

/** Screen aspect, height / width. 19.5:9 is the modern default. */
export const SCREEN_RATIO = 19.5 / 9;

export function PhoneFrame({
  screenHeight,
  children,
  className = '',
}: {
  screenHeight: number;
  children: React.ReactNode;
  className?: string;
}) {
  const screenWidth = screenHeight / SCREEN_RATIO;

  /* Bezel and corner radius scale with the device so the frame looks the same
     at any size, rather than turning into a thick black slab when the phone is
     small. Ratios taken off a real handset. */
  const bezel = Math.round(screenHeight * 0.0125);
  const bodyRadius = Math.round(screenHeight * 0.055);
  const screenRadius = bodyRadius - bezel;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{
        width: screenWidth + bezel * 2,
        height: screenHeight + bezel * 2,
        padding: bezel,
        borderRadius: bodyRadius,
        background: '#111827',
        // The one shadow outside a callout. A phone genuinely sits above the
        // page rather than in it, and with no shadow the body reads as a flat
        // black rectangle someone drew.
        boxShadow:
          '0 24px 48px -16px rgba(77, 82, 96, 0.34), 0 4px 12px -4px rgba(77, 82, 96, 0.2)',
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden bg-black"
        style={{ borderRadius: screenRadius }}
      >
        {children}

        {/* Island. Sits over the screen content, as it does on the device. */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bg-black"
          style={{
            top: Math.round(screenHeight * 0.012),
            width: Math.round(screenWidth * 0.3),
            height: Math.round(screenHeight * 0.0165),
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
