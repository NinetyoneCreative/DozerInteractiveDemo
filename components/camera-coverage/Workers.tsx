'use client';

/**
 * The draggable jobsite workers.
 *
 * Each worker's state comes from the same solver functions the ground grid uses,
 * evaluated at the worker's feet — so a worker standing in a seam registers as
 * not seen, and can never disagree with the coverage drawn underneath them.
 * The ring carries the same three states as the ground: green where the operator
 * can see them directly, blue where only a camera can, warning where neither can.
 *
 * The state is never signalled by colour alone: an unseen worker also gets a
 * pulsing ring and a floating alert marker, and the panel names them in words.
 */

import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { COLORS, WORKER, WORKERS } from './config';

interface WorkersProps {
  positions: [number, number][];
  coverage: number[];
  /** Whether the operator has direct sight of each worker from the cab. */
  operatorSees: boolean[];
  selectedId: string | null;
  touch: boolean;
  reducedMotion: boolean;
  onPointerDown: (index: number, e: { stopPropagation: () => void }) => void;
  onSelect: (id: string) => void;
}

export function Workers({
  positions,
  coverage,
  operatorSees,
  selectedId,
  touch,
  reducedMotion,
  onPointerDown,
  onSelect,
}: WorkersProps) {
  return (
    <group>
      {WORKERS.map((w, i) => (
        <Worker
          key={w.id}
          label={w.label}
          x={positions[i]?.[0] ?? w.start[0]}
          z={positions[i]?.[1] ?? w.start[1]}
          seen={coverage[i] ?? 0}
          direct={operatorSees[i] ?? false}
          selected={selectedId === w.id}
          touch={touch}
          reducedMotion={reducedMotion}
          onPointerDown={(e) => { onSelect(w.id); onPointerDown(i, e); }}
        />
      ))}
    </group>
  );
}

function Worker({
  label,
  x,
  z,
  seen,
  direct,
  selected,
  touch,
  reducedMotion,
  onPointerDown,
}: {
  label: string;
  x: number;
  z: number;
  seen: number;
  direct: boolean;
  selected: boolean;
  touch: boolean;
  reducedMotion: boolean;
  onPointerDown: (e: { stopPropagation: () => void }) => void;
}) {
  // Three states, matching the ground exactly: the operator has them, only a
  // camera has them, or nobody does. The operator wins the overlap, so blue on a
  // worker always means "you would not see this person without the screen".
  const covered = direct || seen > 0;
  const [hover, setHover] = useState(false);
  const ringRef = useRef<THREE.Mesh>(null);
  const alertRef = useRef<THREE.Group>(null);
  const h = WORKER.height;
  const state = direct ? COLORS.operator : seen > 0 ? COLORS.coverage : COLORS.warning;

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    // Only the unseen state animates — a covered worker is quiet.
    if (ringRef.current) ringRef.current.scale.setScalar(covered ? 1 : 1 + Math.sin(t * 3.6) * 0.09);
    if (alertRef.current) alertRef.current.position.y = h + 0.55 + Math.sin(t * 2.6) * 0.06;
  });

  return (
    <group position={[x, 0, z]} name={`worker:${label}`}>
      {/* Generous invisible hit target — thumbs are not mice. */}
      <mesh
        visible={false}
        position={[0, h / 2, 0]}
        onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e); }}
        onPointerOver={() => { setHover(true); document.body.style.cursor = 'grab'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      >
        <cylinderGeometry args={[touch ? 0.8 : 0.52, touch ? 0.8 : 0.52, h * 1.25, 10]} />
      </mesh>

      {/* boots + legs */}
      <mesh position={[0, h * 0.23, 0]} castShadow raycast={() => null}>
        <capsuleGeometry args={[0.12, h * 0.32, 6, 12]} />
        <meshStandardMaterial color="#3b4048" roughness={0.85} />
      </mesh>
      {/* torso */}
      <mesh position={[0, h * 0.6, 0]} castShadow raycast={() => null}>
        <capsuleGeometry args={[0.17, h * 0.26, 6, 14]} />
        <meshStandardMaterial color="#4d5260" roughness={0.75} />
      </mesh>
      {/* hi-vis vest over the torso */}
      <mesh position={[0, h * 0.6, 0]} castShadow raycast={() => null}>
        <cylinderGeometry args={[0.205, 0.205, h * 0.3, 14, 1, true]} />
        <meshStandardMaterial color={COLORS.hiVis} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      {/* retro-reflective band */}
      <mesh position={[0, h * 0.63, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.212, 0.212, 0.07, 14, 1, true]} />
        <meshStandardMaterial color="#eef4f7" roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* head */}
      <mesh position={[0, h * 0.855, 0]} castShadow raycast={() => null}>
        <sphereGeometry args={[0.105, 14, 12]} />
        <meshStandardMaterial color="#9c7b62" roughness={0.8} />
      </mesh>
      {/* hard hat */}
      <mesh position={[0, h * 0.905, 0]} castShadow raycast={() => null} scale={[1, 0.82, 1]}>
        <sphereGeometry args={[0.122, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f0f3f5" roughness={0.45} />
      </mesh>
      <mesh position={[0, h * 0.903, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.1, 0.145, 16]} />
        <meshStandardMaterial color="#e4e8ec" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* State ring on the ground. */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} raycast={() => null} renderOrder={4}>
        <ringGeometry args={[0.48, hover || selected ? 0.76 : 0.66, 40]} />
        <meshBasicMaterial
          color={state}
          transparent
          opacity={covered ? 0.85 : 1}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Shape, not just colour: only an unseen worker carries the marker. */}
      {!covered ? (
        <group ref={alertRef} position={[0, h + 0.55, 0]} raycast={() => null}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[0.19, 0]} />
            <meshBasicMaterial color={COLORS.warning} toneMapped={false} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
