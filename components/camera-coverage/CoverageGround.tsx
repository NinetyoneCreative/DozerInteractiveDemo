'use client';

/**
 * The solved coverage painted onto the ground, plus the working-radius ring.
 * The ground surface itself belongs to Environment.tsx.
 *
 * Coverage is uploaded as a DataTexture — one RGBA buffer rewritten on each
 * solve, which is far cheaper than rebuilding a mesh, and at 0.25 m cells that
 * is a 160 × 160 upload.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS, COVERAGE_STYLE, GRID } from './config';
import { gridCells } from './coverage';
import type { CoverageResult } from './types';

/** "#rrggbb" -> [r, g, b] bytes, with no colour-space conversion. */
function srgbBytes(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

interface CoverageGroundProps {
  coverage: CoverageResult | null;
  workingRadius: number;
  visible: boolean;
}

export function CoverageGround({ coverage, workingRadius, visible }: CoverageGroundProps) {
  const cells = gridCells();

  const texture = useMemo(() => {
    const data = new Uint8Array(cells * cells * 4);
    const t = new THREE.DataTexture(data, cells, cells, THREE.RGBAFormat);
    // The bytes below are plain sRGB, so the texture must be tagged as such —
    // otherwise three treats them as linear and the whole overlay shifts hue.
    t.colorSpace = THREE.SRGBColorSpace;
    // Nearest, not linear: the seams are the honest part of this drawing and
    // interpolation would feather them into something softer than they are.
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, [cells]);

  useEffect(() => () => texture.dispose(), [texture]);

  const blue = useMemo(() => srgbBytes(COLORS.coverage), []);
  const blueLift = useMemo(() => srgbBytes(COLORS.coverageOverlap), []);
  const warn = useMemo(() => srgbBytes(COLORS.warning), []);
  const white = useMemo<[number, number, number]>(() => [255, 255, 255], []);

  useEffect(() => {
    const data = texture.image.data as Uint8Array;
    if (!coverage) { data.fill(0); texture.needsUpdate = true; return; }

    const radiusSq = workingRadius * workingRadius;
    const half = GRID.extent / 2;
    const { depth } = coverage;

    for (let iz = 0; iz < cells; iz++) {
      const z = (iz + 0.5) * GRID.cell - half;
      // The plane is laid flat with a -90° X rotation, which points its local +Y
      // (texture v) along world -Z. So texture rows run back-to-front.
      const row = cells - 1 - iz;
      for (let ix = 0; ix < cells; ix++) {
        const x = (ix + 0.5) * GRID.cell - half;
        const src = iz * cells + ix;
        const dst = (row * cells + ix) * 4;
        const d = depth[src];
        const inRadius = x * x + z * z <= radiusSq;

        // Every cell is painted for what it is, the ground under the machine
        // included. The footprint is excluded from the statistics, not the picture.
        if (d === 0 && !inRadius) { data[dst + 3] = 0; continue; }

        // Is this cell on a covered / uncovered boundary? That rim is what gives
        // the zones a hard edge instead of a soft wash.
        let edge = false;
        const covered = d > 0;
        if (ix > 0 && (depth[src - 1] > 0) !== covered) edge = true;
        else if (ix < cells - 1 && (depth[src + 1] > 0) !== covered) edge = true;
        else if (iz > 0 && (depth[src - cells] > 0) !== covered) edge = true;
        else if (iz < cells - 1 && (depth[src + cells] > 0) !== covered) edge = true;

        let r: number;
        let g: number;
        let b: number;
        let a: number;

        if (covered) {
          // Overlap lifts towards white rather than shifting hue, so two cameras
          // read as "more of the same" instead of a different state.
          const t = Math.min((d - 1) / 2, 1);
          r = mix(blue[0], blueLift[0], t);
          g = mix(blue[1], blueLift[1], t);
          b = mix(blue[2], blueLift[2], t);
          a = Math.min(
            COVERAGE_STYLE.coveredAlpha + (d - 1) * COVERAGE_STYLE.overlapAlphaStep,
            COVERAGE_STYLE.coveredAlphaMax,
          );
        } else {
          r = warn[0]; g = warn[1]; b = warn[2];
          a = COVERAGE_STYLE.blindAlpha;
        }

        if (edge) {
          const k = COVERAGE_STYLE.edgeLift;
          r = mix(r, white[0], k);
          g = mix(g, white[1], k);
          b = mix(b, white[2], k);
          a = COVERAGE_STYLE.edgeAlpha;
        }

        data[dst] = r;
        data[dst + 1] = g;
        data[dst + 2] = b;
        data[dst + 3] = a * 255;
      }
    }
    texture.needsUpdate = true;
  }, [coverage, texture, cells, workingRadius, blue, blueLift, warn, white]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} visible={visible} renderOrder={1}>
        <planeGeometry args={[GRID.extent, GRID.extent]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      <WorkingRadiusRing radius={workingRadius} />
    </group>
  );
}

/** Dashed ring marking the zone the coverage percentage is measured over. */
function WorkingRadiusRing({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const steps = 240;
    for (let i = 0; i < steps; i++) {
      // Dashes: draw every other segment.
      if (i % 2) continue;
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1) / steps) * Math.PI * 2;
      pts.push(Math.sin(a0) * radius, 0, Math.cos(a0) * radius);
      pts.push(Math.sin(a1) * radius, 0, Math.cos(a1) * radius);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [radius]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} position={[0, 0.03, 0]} renderOrder={3}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.7} toneMapped={false} depthWrite={false} />
    </lineSegments>
  );
}
