'use client';

/**
 * Maps a step onto the component that draws it.
 *
 * Kept apart from lib/deck.ts so the script stays pure data — the presenter
 * window imports the script to render its chapter list and notes, and should not
 * have to pull three.js across to print a heading.
 *
 * `preview` is the presenter view's next-step thumbnail. It renders the real
 * slide at a small scale for everything except the 3D chapter, which falls back
 * to the pre-rendered poster: a second WebGL context and a second 4MB GLB, in a
 * window nobody is looking at, on a laptop that is also screen-sharing, is a
 * cost with no benefit.
 */

import type { Step } from '@/lib/deck';
import {
  AgendaSlide,
  CloseSlide,
  CoverSlide,
  PilotSlide,
  PointsSlide,
  StatementSlide,
  TimelineSlide,
} from './Basic';
import { EventsSlide, ReportSlide } from './Data';
import { InCabSlide } from './InCab';
import { CoveragePreview, CoverageSlide, DashboardSlide } from './Interactive';
import { SystemDiagramSlide } from './SystemDiagram';

export function renderStep(
  step: Step,
  { interact = false, preview = false }: { interact?: boolean; preview?: boolean } = {},
) {
  const s = step.slide;

  switch (s.kind) {
    case 'cover':
      return <CoverSlide />;

    case 'agenda':
      return <AgendaSlide />;

    case 'statement':
      return <StatementSlide lead={s.lead} sub={s.sub} stat={s.stat} image={s.image} />;

    case 'points':
      return (
        <PointsSlide
          eyebrow={step.eyebrow}
          title={step.title}
          intro={s.intro}
          points={s.points}
          columns={s.columns}
        />
      );

    case 'system':
      return (
        <SystemDiagramSlide
          eyebrow={step.eyebrow}
          title={step.title}
          highlight={s.highlight ?? null}
        />
      );

    case 'coverage':
      if (preview) return <CoveragePreview machine={s.machine} />;
      return (
        <CoverageSlide
          eyebrow={step.eyebrow}
          title={step.title}
          machine={s.machine}
          environment={s.environment}
          cameras={s.cameras}
          callout={s.callout}
          interact={interact}
        />
      );

    case 'dashboard':
      return (
        <DashboardSlide
          eyebrow={step.eyebrow}
          title={step.title}
          focus={s.focus}
          callout={s.callout}
          // A preview is never interactive, whatever the stage is doing.
          interact={preview ? false : interact}
        />
      );

    case 'incab':
      return (
        <InCabSlide
          eyebrow={step.eyebrow}
          title={step.title}
          focus={s.focus}
          callout={s.callout}
          // Nothing autoplays in the presenter window's thumbnail: it is a
          // second decode of a clip nobody is watching, on the same laptop that
          // is screen-sharing the one they are.
          active={!preview}
        />
      );

    case 'events':
      return <EventsSlide eyebrow={step.eyebrow} title={step.title} />;

    case 'report':
      return <ReportSlide eyebrow={step.eyebrow} title={step.title} />;

    case 'timeline':
      return <TimelineSlide eyebrow={step.eyebrow} title={step.title} phases={s.phases} />;

    case 'pilot':
      return <PilotSlide />;

    case 'close':
      return <CloseSlide />;
  }
}

/**
 * The React key for a slide, which is what decides whether advancing a step
 * remounts it.
 *
 * Consecutive steps that share a live module share a key, so moving between them
 * updates props instead of tearing the module down: the GLB is not re-fetched,
 * the orbit camera does not snap back, and the dashboard's focus ring animates
 * from one region to the next rather than cutting. Everything else is keyed per
 * step and gets the normal cross-fade.
 */
export function slideKey(step: Step): string {
  switch (step.slide.kind) {
    case 'coverage':
      return 'module:coverage';
    case 'dashboard':
      return 'module:dashboard';
    case 'incab':
      return 'module:incab';
    default:
      return step.id;
  }
}

/** Whether `I` means anything on this step. */
export function isInteractive(step: Step): boolean {
  return step.slide.kind === 'coverage' || step.slide.kind === 'dashboard';
}
