'use client';

/**
 * Scene dressing: the ground surface and the props around the machine.
 *
 * All of it is scenery. The coverage solver reads the machine's colliders and
 * nothing from this file, so switching environments never moves the percentage —
 * the claim stays about the camera package. Props that would genuinely block a
 * lens are kept outside the working radius.
 *
 * Surfaces are drawn to a canvas at runtime rather than shipped as image files,
 * so an environment costs no extra network request.
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, ENVIRONMENTS, GRID } from './config';
import type { EnvironmentKey } from './config';

const GROUND_SIZE = GRID.extent * 2.6;

/* ------------------------------------------------------------- surfaces ---*/

type Surface = 'plain' | 'asphalt' | 'dirt';

/** Deterministic value noise so a surface looks the same on every load. */
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSurface(kind: Surface, base: string): THREE.Texture | null {
  if (kind === 'plain' || typeof document === 'undefined') return null;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  if (!g) return null;
  const rnd = mulberry(kind === 'asphalt' ? 11 : 29);

  g.fillStyle = base;
  g.fillRect(0, 0, S, S);

  if (kind === 'asphalt') {
    // Broad tonal patches first — fine speckle alone vanishes once the texture is
    // minified across 40 m of ground, leaving a flat slab of colour.
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.02 + rnd() * 0.04})` : `rgba(0,0,0,${0.03 + rnd() * 0.06})`;
      g.beginPath();
      g.ellipse(rnd() * S, rnd() * S, 24 + rnd() * 120, 18 + rnd() * 90, rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // Repair scars.
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = `rgba(0,0,0,${0.12 + rnd() * 0.12})`;
      g.lineWidth = 2 + rnd() * 5;
      g.beginPath();
      let px = rnd() * S;
      let py = rnd() * S;
      g.moveTo(px, py);
      for (let k = 0; k < 5; k++) {
        px += (rnd() - 0.5) * 190;
        py += (rnd() - 0.5) * 190;
        g.lineTo(px, py);
      }
      g.stroke();
    }
    for (let i = 0; i < 26000; i++) {
      const v = rnd();
      g.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.03 + v * 0.05})` : `rgba(0,0,0,${0.04 + v * 0.08})`;
      g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
    }
  } else if (kind === 'dirt') {
    // Clumped earth: broad tonal blotches, then grit and the odd stone.
    for (let i = 0; i < 260; i++) {
      const warm = rnd() > 0.5;
      g.fillStyle = warm ? `rgba(110,84,54,${0.08 + rnd() * 0.14})` : `rgba(198,176,140,${0.08 + rnd() * 0.14})`;
      g.beginPath();
      g.ellipse(rnd() * S, rnd() * S, 20 + rnd() * 110, 16 + rnd() * 80, rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // Track ruts left by the plant.
    for (let i = 0; i < 5; i++) {
      const y0 = rnd() * S;
      g.strokeStyle = `rgba(84,64,42,${0.14 + rnd() * 0.14})`;
      g.lineWidth = 9 + rnd() * 12;
      g.beginPath();
      g.moveTo(-20, y0);
      for (let x = 0; x <= S + 20; x += 64) g.lineTo(x, y0 + Math.sin(x / 90 + i) * 16);
      g.stroke();
    }
    for (let i = 0; i < 20000; i++) {
      const v = rnd();
      g.fillStyle = v > 0.55 ? `rgba(214,196,164,${0.05 + v * 0.09})` : `rgba(64,48,30,${0.05 + v * 0.1})`;
      g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(150,140,124,${0.25 + rnd() * 0.3})`;
      g.beginPath();
      g.arc(rnd() * S, rnd() * S, 1.5 + rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  // One tile per ~16 m. Tiling much tighter than this averages the detail away
  // at the distances this scene is viewed from.
  const metresPerTile = 16;
  t.repeat.set(GROUND_SIZE / metresPerTile, GROUND_SIZE / metresPerTile);
  return t;
}

/* ------------------------------------------------------------------ props -*/

const ASPHALT_LINE = '#e8e2cf';

/**
 * Kerb + footway either side of a carriageway running along Z.
 *
 * The footway is a long box, and a tiled texture on a box maps 0..1 per face —
 * which stretches wildly on a 100 m strip. So the slabs are drawn as explicit
 * joint strips instead, which also keeps the paving reading at a distance.
 *
 * The footway is laid at grade rather than on a raised kerb upstand. A real
 * 150 mm upstand would sit above the coverage overlay and hide the very cells the
 * percentage is counting, which reads as "not covered" when it is. The kerb strip
 * still carries the edge, so it reads as a footway without lying about coverage.
 */
function Kerbs({
  halfWidth,
  footway = 3.2,
}: {
  halfWidth: number;
  footway?: number;
}) {
  const joints = useMemo(() => {
    const out: number[] = [];
    for (let z = -GROUND_SIZE / 2; z < GROUND_SIZE / 2; z += 2.4) out.push(z);
    return out;
  }, []);
  const centre = halfWidth + 0.18 + footway / 2;

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* kerb — the only part that stands proud, and only just */}
          <mesh position={[side * (halfWidth + 0.09), 0.045, 0]} receiveShadow>
            <boxGeometry args={[0.2, 0.09, GROUND_SIZE]} />
            <meshStandardMaterial color="#9aa0a7" roughness={0.9} />
          </mesh>
          {/* footway, at grade */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[side * centre, 0.006, 0]} receiveShadow>
            <planeGeometry args={[footway, GROUND_SIZE]} />
            <meshStandardMaterial color="#8d939a" roughness={0.96} />
          </mesh>
          {/* paving joints */}
          <group position={[side * centre, 0.009, 0]}>
            {joints.map((z) => (
              <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z]}>
                <planeGeometry args={[footway, 0.05]} />
                <meshBasicMaterial color="#6e747c" transparent opacity={0.5} toneMapped={false} />
              </mesh>
            ))}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.05, GROUND_SIZE]} />
              <meshBasicMaterial color="#6e747c" transparent opacity={0.4} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Dashed centre line plus solid edge lines, painted flat on the road. */
function RoadMarkings({ halfWidth }: { halfWidth: number }) {
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let z = -GROUND_SIZE / 2; z < GROUND_SIZE / 2; z += 6) out.push(z);
    return out;
  }, []);
  return (
    <group position={[0, 0.006, 0]}>
      {dashes.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <planeGeometry args={[0.16, 3]} />
          <meshBasicMaterial color={ASPHALT_LINE} transparent opacity={0.75} toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * (halfWidth - 0.45), 0, 0]}>
          <planeGeometry args={[0.14, GROUND_SIZE]} />
          <meshBasicMaterial color={ASPHALT_LINE} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Cone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[0.42, 0.06, 0.42]} />
        <meshStandardMaterial color="#2f3238" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <coneGeometry args={[0.17, 0.66, 12]} />
        <meshStandardMaterial color="#ff5a1f" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.125, 0.145, 0.12, 12]} />
        <meshStandardMaterial color="#f2f2f0" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Plastic water-filled barrier, the orange-and-white kind. */
function Barrier({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.84, 0.34]} />
        <meshStandardMaterial color="#ff6a24" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.92, 0.16, 0.36]} />
        <meshStandardMaterial color="#f4f4f2" roughness={0.65} />
      </mesh>
    </group>
  );
}

/** Loose spoil, the sort a machine leaves beside a trench. */
function SpoilPile({
  position,
  radius,
  height,
  seed,
}: {
  position: [number, number, number];
  radius: number;
  height: number;
  seed: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.ConeGeometry(radius, height, 14, 3);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const rnd = mulberry(seed);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < height / 2 - 1e-3) {
        pos.setX(i, pos.getX(i) * (0.82 + rnd() * 0.4));
        pos.setZ(i, pos.getZ(i) * (0.82 + rnd() * 0.4));
        pos.setY(i, y + (rnd() - 0.5) * height * 0.16);
      }
    }
    g.computeVertexNormals();
    return g;
  }, [radius, height, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[position[0], height / 2, position[2]]} castShadow receiveShadow>
      <meshStandardMaterial color="#8a7050" roughness={1} flatShading />
    </mesh>
  );
}

function Building({
  position,
  size,
  tone,
}: {
  position: [number, number, number];
  size: [number, number, number];
  tone: string;
}) {
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={tone} roughness={0.92} />
      </mesh>
      {/* Ground-floor band, so the blocks do not read as bare cubes. */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[size[0] + 0.06, 3.4, size[2] + 0.06]} />
        <meshStandardMaterial color="#6f747c" roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------ environment -*/

export function Environment({ environment }: { environment: EnvironmentKey }) {
  const env = ENVIRONMENTS[environment];
  const surface = useMemo(() => makeSurface(env.surface, env.ground), [env.surface, env.ground]);
  useEffect(() => () => surface?.dispose(), [surface]);

  const roadHalfWidth = 5.4;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial
          color={surface ? '#ffffff' : env.ground}
          map={surface ?? undefined}
          roughness={env.groundRoughness}
          metalness={0}
        />
      </mesh>

      {env.showGrid ? (
        <gridHelper
          args={[GRID.extent, GRID.extent / 2, COLORS.grid, COLORS.grid]}
          position={[0, 0.004, 0]}
        />
      ) : null}

      {environment === 'street' ? (
        <group>
          <Kerbs halfWidth={roadHalfWidth} />
          <RoadMarkings halfWidth={roadHalfWidth} />
          {/* Traffic management down the live lane, clear of the working radius. */}
          {[-16, -12.5, -9, 9, 12.5, 16].map((z) => (
            <Cone key={z} position={[roadHalfWidth - 1.1, 0, z]} />
          ))}
          <Barrier position={[roadHalfWidth - 1.4, 0, 19]} rotation={Math.PI / 2} />
          <Barrier position={[roadHalfWidth - 1.4, 0, -19]} rotation={Math.PI / 2} />
        </group>
      ) : null}

      {environment === 'dirt' ? (
        <group>
          <SpoilPile position={[-13, 0, 9]} radius={3.4} height={1.9} seed={3} />
          <SpoilPile position={[-16.5, 0, 2.5]} radius={2.6} height={1.4} seed={9} />
          <SpoilPile position={[12.5, 0, -13]} radius={3.9} height={2.2} seed={17} />
          <SpoilPile position={[17, 0, 6]} radius={2.2} height={1.2} seed={23} />
          {/* Open trench, kept well outside the working radius. */}
          <mesh position={[-18.5, -0.35, -8]} receiveShadow>
            <boxGeometry args={[2.2, 0.7, 13]} />
            <meshStandardMaterial color="#5d4a33" roughness={1} />
          </mesh>
          {[-14, -10.5, -7].map((z) => (
            <Barrier key={z} position={[-16.6, 0, z]} rotation={Math.PI / 2} />
          ))}
          {[[8.5, 16], [-4, 17.5], [16, -6], [-17, -16]].map(([x, z]) => (
            <Cone key={`${x}:${z}`} position={[x, 0, z]} />
          ))}
        </group>
      ) : null}

      {environment === 'urban' ? (
        <group>
          <Kerbs halfWidth={roadHalfWidth} footway={3.6} />
          <RoadMarkings halfWidth={roadHalfWidth} />
          {/* Blocks well beyond the working radius — context, not occluders. */}
          <Building position={[-27, 0, 17]} size={[13, 11, 15]} tone="#8d9299" />
          <Building position={[-29, 0, -7]} size={[13, 15, 17]} tone="#7d838b" />
          <Building position={[28, 0, 10]} size={[14, 13, 19]} tone="#868c94" />
          <Building position={[30, 0, -17]} size={[13, 9, 14]} tone="#797f88" />
          {/* Street furniture on the footway. */}
          {[-14, 0, 14].map((z) => (
            <group key={z} position={[roadHalfWidth + 2.6, 0, z]}>
              <mesh position={[0, 2.4, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.11, 4.8, 8]} />
                <meshStandardMaterial color="#6d727a" roughness={0.7} />
              </mesh>
            </group>
          ))}
          {[-17, 17].map((z) => (
            <Cone key={z} position={[-roadHalfWidth + 1.2, 0, z]} />
          ))}
        </group>
      ) : null}
    </group>
  );
}
