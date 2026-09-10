'use client';

/**
 * Client boundary for the module. The 3D component pulls in three.js and touches
 * `window` on mount, so it is dynamically imported with ssr disabled — which
 * `next/dynamic` only allows from inside a client component.
 */

import dynamic from 'next/dynamic';
import type { CameraCoverageProps } from './CameraCoverage';

const CameraCoverage = dynamic(() => import('./CameraCoverage'), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-video w-full place-items-center rounded-card border border-dozer-muted/40 bg-dozer-card">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dozer-muted">
        Loading coverage module…
      </p>
    </div>
  ),
});

export default function CameraCoverageClient(props: CameraCoverageProps) {
  return <CameraCoverage {...props} />;
}
