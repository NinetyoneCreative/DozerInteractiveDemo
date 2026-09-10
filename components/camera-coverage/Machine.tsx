'use client';

/**
 * GLB loader plus the rig groups.
 *
 * The GLB files are already split into named nodes with their origins on the real
 * pivots, so nothing here corrects an offset — the groups just nest the nodes and
 * apply the articulation angles.
 *
 * On load the parsed node tree is logged, and a missing node throws a readable
 * error rather than quietly rendering a machine that will not move.
 */

import { useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MACHINES } from './config';
import type { MachineKey, RigState, Vec3 } from './types';

const DEG = Math.PI / 180;
/** How far a GLB pivot may drift from config.pivots before we warn, metres. */
const PIVOT_TOLERANCE = 0.02;

export interface RigNodes {
  /** Every named mesh node in the file, for hit-testing camera drags. */
  meshes: Record<string, THREE.Mesh>;
}

interface MachineProps {
  machineKey: MachineKey;
  rig: RigState;
  onNodesReady?: (nodes: RigNodes) => void;
  /** Fires with the node name when a draggable part is grabbed. */
  onPartPointerDown?: (part: 'swing' | 'arm', e: ThreeEvent<PointerEvent>) => void;
}

/** Pulls the named mesh nodes out of a loaded GLTF and checks the rig is complete. */
function useRigNodes(machineKey: MachineKey, scene: THREE.Object3D) {
  return useMemo(() => {
    const machine = MACHINES[machineKey];
    const expected =
      machine.rig.type === 'slew'
        ? [machine.rig.nodes.base, machine.rig.nodes.rotating, machine.rig.nodes.arm]
        : [machine.rig.nodes.rear, machine.rig.nodes.front, machine.rig.nodes.arm];

    const meshes: Record<string, THREE.Mesh> = {};
    const tree: string[] = [];
    scene.traverse((o) => {
      const depth = (() => {
        let d = 0;
        let p: THREE.Object3D | null = o.parent;
        while (p) { d++; p = p.parent; }
        return d;
      })();
      tree.push(`${'  '.repeat(depth)}${o.name || '(unnamed)'} <${o.type}>`);
      if ((o as THREE.Mesh).isMesh && o.name) meshes[o.name] = o as THREE.Mesh;
    });

    // eslint-disable-next-line no-console
    console.info(`[camera-coverage] ${machine.label} node tree (${machine.glb}):\n${tree.join('\n')}`);

    const missing = expected.filter((n) => !meshes[n]);
    if (missing.length) {
      const found = Object.keys(meshes).join(', ') || '(none)';
      throw new Error(
        `[camera-coverage] ${machine.glb} is missing the rig node(s): ${missing.join(', ')}.\n` +
          `A "${machine.rig.type}" rig needs exactly: ${expected.join(', ')}.\n` +
          `Named mesh nodes found in the file: ${found}.\n` +
          `Re-export the GLB with those node names, or update MACHINES.${machineKey}.rig.nodes in config.ts.`,
      );
    }

    // The solver builds its own transforms from config.pivots. If a swapped GLB
    // moves a pivot, the coverage maths would silently drift out of step with what
    // is on screen — so check the two agree.
    for (const [name, expectedPivot] of Object.entries(machine.pivots)) {
      const node = meshes[name];
      if (!node) continue;
      const p = node.position;
      const drift = Math.max(
        Math.abs(p.x - expectedPivot[0]),
        Math.abs(p.y - expectedPivot[1]),
        Math.abs(p.z - expectedPivot[2]),
      );
      if (drift > PIVOT_TOLERANCE) {
        // eslint-disable-next-line no-console
        console.warn(
          `[camera-coverage] pivot mismatch on "${name}": the GLB has ` +
            `[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}] but config.ts declares ` +
            `[${expectedPivot.join(', ')}]. Coverage will be solved against the config value. ` +
            `Update MACHINES.${machineKey}.pivots.${name} to match the file.`,
        );
      }
    }

    return { meshes };
  }, [machineKey, scene]);
}

export function Machine({ machineKey, rig, onNodesReady, onPartPointerDown }: MachineProps) {
  const machine = MACHINES[machineKey];
  const { scene } = useGLTF(machine.glb);
  const nodes = useRigNodes(machineKey, scene);

  useEffect(() => { onNodesReady?.(nodes); }, [nodes, onNodesReady]);

  const names =
    machine.rig.type === 'slew'
      ? { base: machine.rig.nodes.base, swing: machine.rig.nodes.rotating, arm: machine.rig.nodes.arm }
      : { base: machine.rig.nodes.rear, swing: machine.rig.nodes.front, arm: machine.rig.nodes.arm };

  const armPivot = machine.pivots[names.arm] as Vec3;
  const grab = (part: 'swing' | 'arm') => (e: ThreeEvent<PointerEvent>) => onPartPointerDown?.(part, e);

  return (
    <group>
      {/* Fixed base: undercarriage, or the rear frame the cab sits on. */}
      <Part mesh={nodes.meshes[names.base]} />

      {/* Slews about the ring, or steers about the centre joint. */}
      <group rotation={[0, rig.swing * DEG, 0]}>
        <Part mesh={nodes.meshes[names.swing]} onPointerDown={grab('swing')} cursor />

        {/* Boom, or loader arms. Negative raises. */}
        <group position={armPivot} rotation={[rig.arm * DEG, 0, 0]}>
          <Part mesh={nodes.meshes[names.arm]} onPointerDown={grab('arm')} cursor />
        </group>
      </group>
    </group>
  );
}

/**
 * Renders one rig node's geometry in place. The geometry is already expressed
 * relative to that node's pivot, so no position is applied here.
 */
function Part({
  mesh,
  onPointerDown,
  cursor,
}: {
  mesh: THREE.Mesh | undefined;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  cursor?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  if (!mesh) return null;
  return (
    <mesh
      ref={ref}
      name={mesh.name}
      geometry={mesh.geometry}
      material={mesh.material as THREE.Material}
      castShadow
      receiveShadow
      onPointerDown={onPointerDown}
      onPointerOver={cursor ? () => { document.body.style.cursor = 'grab'; } : undefined}
      onPointerOut={cursor ? () => { document.body.style.cursor = ''; } : undefined}
    />
  );
}

/** Warms both GLBs so switching machines is instant. */
export function preloadMachines() {
  for (const m of Object.values(MACHINES)) useGLTF.preload(m.glb);
}
