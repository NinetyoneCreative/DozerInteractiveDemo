'use client';

/**
 * The two chapters that embed a live module: the 3D coverage scene and the
 * dashboard.
 *
 * Both are gated behind interact mode. Until the rep presses I the module is
 * inert — pointer events off, nothing to click by accident. A stray click that
 * swings an excavator while the rep is mid-sentence is a small disaster on a
 * shared screen, and the deck's own arrow keys have to keep working right up
 * until the moment the rep deliberately hands them over.
 *
 * Both modules stay MOUNTED across every step of their chapter. See the slideKey
 * logic in components/stage/Deck.tsx: remounting would re-download a 4MB GLB and
 * reset the orbit camera between two steps that are meant to read as the same
 * scene.
 */

import CameraCoverageClient from '@/components/camera-coverage/CameraCoverageClient';
import { Dashboard } from '@/components/dashboard/Dashboard';
import type { DashboardFocus } from '@/lib/deck';
import { JOBSITE } from '@/lib/demoData';
import { Callout, SampleDataChip, SlideFrame } from './Frame';

/* ── 3D coverage ─────────────────────────────────────────────────────────── */

export function CoverageSlide({
  eyebrow,
  title,
  machine,
  environment,
  cameras,
  callout,
  interact,
}: {
  eyebrow: string;
  title: string;
  machine: 'excavator' | 'wheelLoader';
  environment: 'studio' | 'street' | 'dirt' | 'urban';
  cameras: 'all' | 'single';
  callout: string;
  interact: boolean;
}) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title} compact>
      <div className="relative h-full">
        <div
          className={[
            'h-full transition-opacity duration-200',
            interact ? '' : 'pointer-events-none',
          ].join(' ')}
        >
          {/* initialMachine / initialEnvironment change per step; the module's
              own initialize() picks them up without counting as user input, so
              it keeps auto-rotating until someone actually touches it. */}
          <CameraCoverageClient
            initialMachine={machine}
            initialEnvironment={environment}
            initialShowAllCameras={cameras === 'all'}
            height="770px"
          />
        </div>

        <FloatingCallout>{callout}</FloatingCallout>
      </div>
    </SlideFrame>
  );
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export function DashboardSlide({
  eyebrow,
  title,
  focus,
  callout,
  interact,
}: {
  eyebrow: string;
  title: string;
  focus: DashboardFocus;
  callout: string;
  interact: boolean;
}) {
  return (
    <SlideFrame eyebrow={eyebrow} title={title} compact>
      <div className="relative flex h-full flex-col">
        {/* The chip rides in the top-right of the title block rather than inside
            the dashboard, where it would dim along with whichever region is
            currently out of focus. */}
        <div className="absolute -top-[62px] right-0 z-10">
          <SampleDataChip />
        </div>

        <div className={`min-h-0 flex-1 ${interact ? '' : 'pointer-events-none'}`}>
          <Dashboard focus={focus} />
        </div>

        {/* Unlike the 3D chapter, this callout does NOT float. The dashboard
            fills its canvas edge to edge, so anything floating over it covers
            data — and the row it would have covered is the machines table, which
            is the strongest slide in the chapter. It gets its own reserved
            space instead. */}
        <div className="mt-3.5 max-w-[820px] shrink-0">
          <Callout>{callout}</Callout>
        </div>
      </div>
    </SlideFrame>
  );
}

/**
 * The callout sits over the bottom-left of the module, above the progress rail.
 * It is the one element in the deck with a shadow, because it is the one element
 * that genuinely floats over live content rather than sitting in the layout.
 */
function FloatingCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-0 left-0 z-10 max-w-[720px]">
      <Callout>{children}</Callout>
    </div>
  );
}

/** Used by the presenter view's preview, where mounting three.js is not worth it. */
export function CoveragePreview({ machine }: { machine: 'excavator' | 'wheelLoader' }) {
  /* h-full/w-full, not max-*: the preview canvas is the authored 1920x1080
     stage, so a poster left at its natural size renders about 600px wide and
     then gets scaled down with everything else — which is how it ended up as a
     stamp in the corner of the presenter window. */
  return (
    <div className="h-full w-full bg-dozer-page p-16">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={machine === 'excavator' ? '/poster-excavator.png' : '/poster-wheel-loader.png'}
        alt={`Coverage preview, ${machine === 'excavator' ? 'excavator' : 'wheel loader'}`}
        className="h-full w-full rounded-card object-contain"
      />
    </div>
  );
}

export const PREVIEW_JOBSITE = JOBSITE.name;
