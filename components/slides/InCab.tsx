'use client';

/**
 * The in-cab display chapter's slide: the device, the recording inside it, and
 * the callout underneath.
 *
 * Like the dashboard, the callout does NOT float over the content. The display
 * fills its screen edge to edge, so anything floating on top covers a camera
 * feed — and the feeds are the entire reason the chapter exists.
 */

import { DeviceFrame } from '@/components/mobile/DeviceFrame';
import { InCabDisplay } from '@/components/mobile/InCabDisplay';
import type { Sector } from '@/lib/deck';
import { Callout, SlideFrame } from './Frame';

export function InCabSlide({
  eyebrow,
  title,
  focus,
  callout,
  active,
}: {
  eyebrow: string;
  title: string;
  focus: Sector;
  callout: string;
  /** False in the presenter window's thumbnail, where nothing should autoplay. */
  active: boolean;
}) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title} compact>
      <div className="flex h-full flex-col items-center">
        <DeviceFrame screenHeight={716}>
          <InCabDisplay focus={focus} active={active} />
        </DeviceFrame>

        <div className="mt-4 w-full max-w-[900px] shrink-0 self-start">
          <Callout>{callout}</Callout>
        </div>
      </div>
    </SlideFrame>
  );
}
