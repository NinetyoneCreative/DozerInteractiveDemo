'use client';

/**
 * One camera: the gizmo you click and drag, and the frustum wedge it projects.
 *
 * Rendered as a child of its mount node's group, so it inherits that node's
 * world transform for free — the coverage maths in coverage.ts does the same
 * thing analytically, and the two must agree.
 */

import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, COVERAGE_STYLE, RANGE } from './config';
import type { CameraState } from './types';

const DEG = Math.PI / 180;

/**
 * Rectangular pyramid from the lens out to RANGE.max, with vertex alpha fading
 * to nothing at the far end. Additive blending makes overlaps read brighter.
 */
function useFrustumGeometry(hFov: number, vFov: number) {
  return useMemo(() => {
    const segments = COVERAGE_STYLE.frustumSegments;
    const tanH = Math.tan((hFov / 2) * DEG);
    const tanV = Math.tan((vFov / 2) * DEG);
    const R = RANGE.max;

    const positions: number[] = [];
    const colors: number[] = [];
    const base = new THREE.Color(COLORS.coverage);

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const z = t * R;
      const hw = z * tanH;
      const hh = z * tanV;
      // Opaque at the lens, gone at max range.
      const a = COVERAGE_STYLE.frustumAlpha * Math.pow(1 - t, 2.4);
      const ring: [number, number][] = [
        [-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh],
      ];
      for (const [x, y] of ring) {
        positions.push(x, y, z);
        colors.push(base.r, base.g, base.b, a);
      }
    }

    const indices: number[] = [];
    for (let s = 0; s < segments; s++) {
      const a = s * 4;
      const b = (s + 1) * 4;
      for (let e = 0; e < 4; e++) {
        const n = (e + 1) % 4;
        indices.push(a + e, b + e, b + n);
        indices.push(a + e, b + n, a + n);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    g.setIndex(indices);
    g.computeBoundingSphere();
    return g;
  }, [hFov, vFov]);
}

interface CameraRigProps {
  camera: CameraState;
  selected: boolean;
  showFrustum: boolean;
  /** Bigger hit target on coarse pointers. */
  touch: boolean;
  onSelect: (id: string) => void;
  onGizmoPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}

export function CameraRig({
  camera,
  selected,
  showFrustum,
  touch,
  onSelect,
  onGizmoPointerDown,
}: CameraRigProps) {
  const geometry = useFrustumGeometry(camera.hFov, camera.vFov);

  // Matches the yaw/pitch convention in coverage.ts: local +Z is the view axis,
  // so the pitch sign is flipped to make negative pitch look down.
  const rotation = useMemo(
    () => new THREE.Euler(-camera.pitch * DEG, camera.yaw * DEG, 0, 'YXZ'),
    [camera.pitch, camera.yaw],
  );

  const hitRadius = touch ? 0.62 : 0.38;
  const bodyColor = selected ? COLORS.coverage : COLORS.heading;

  return (
    <group position={camera.position} rotation={rotation}>
      {showFrustum && camera.enabled ? (
        <mesh geometry={geometry} renderOrder={2}>
          <meshBasicMaterial
            vertexColors
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {/* Invisible, generously sized hit target — thumbs are not mice. */}
      <mesh
        visible={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(camera.id);
          onGizmoPointerDown(camera.id, e);
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <sphereGeometry args={[hitRadius, 8, 8]} />
      </mesh>

      {/* Housing */}
      <mesh castShadow raycast={() => null}>
        <boxGeometry args={[0.26, 0.2, 0.3]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.45}
          metalness={0.1}
          opacity={camera.enabled ? 1 : 0.35}
          transparent={!camera.enabled}
        />
      </mesh>

      {/* Lens, pointing down the view axis */}
      <mesh position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.075, 0.075, 0.08, 16]} />
        <meshStandardMaterial color={camera.enabled ? COLORS.coverage : COLORS.muted} roughness={0.3} />
      </mesh>

      {selected ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <torusGeometry args={[0.34, 0.022, 8, 28]} />
          <meshBasicMaterial color={COLORS.coverage} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}
