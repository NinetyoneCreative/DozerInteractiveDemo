'use client';

/**
 * Lights, environment, machine, camera rigs, the workers — and the three
 * interactions: orbit, articulation drag, camera edit drag.
 *
 * The coverage solve is throttled behind a dirty flag (store.revision) and never
 * runs inside the frame loop.
 */

import { ContactShadows, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CAMERA_VIEW, COLORS, ENVIRONMENTS, GRID, MACHINES } from './config';
import { buildContext, clamp, coverageAt, operatorSeesAt, solveCoverage } from './coverage';
import type { CoverageContext } from './coverage';
import { CameraRig } from './CameraRig';
import { CoverageGround } from './CoverageGround';
import { Environment } from './Environment';
import { Workers } from './Workers';
import { Machine } from './Machine';
import { effectiveCameras, useCoverageStore } from './store';
import type { Vec3 } from './types';

const DEG = Math.PI / 180;
/** Degrees of arm travel per pixel of vertical drag. */
const ARM_DRAG_SENSITIVITY = 0.28;
/** How far a repositioned camera stands off the surface it was dropped on, metres. */
const MOUNT_STANDOFF = 0.16;

type DragMode =
  | { kind: 'swing'; startAngle: number; startValue: number }
  | { kind: 'arm'; startY: number; startValue: number }
  | { kind: 'camera'; id: string }
  | { kind: 'worker'; index: number }
  | null;

interface SceneProps {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  reducedMotion: boolean;
  touch: boolean;
  onReady?: () => void;
}

export function Scene({ controlsRef, reducedMotion, touch, onReady }: SceneProps) {
  const machineKey = useCoverageStore((s) => s.machineKey);
  const rig = useCoverageStore((s) => s.rig);
  const cameras = useCoverageStore((s) => s.cameras);
  const showAll = useCoverageStore((s) => s.showAllCameras);
  const showGround = useCoverageStore((s) => s.showGround);
  const showFrusta = useCoverageStore((s) => s.showFrusta);
  const selectedId = useCoverageStore((s) => s.selectedCameraId);
  const environment = useCoverageStore((s) => s.environment);
  const workers = useCoverageStore((s) => s.workers);
  const selectedWorkerId = useCoverageStore((s) => s.selectedWorkerId);
  const revision = useCoverageStore((s) => s.revision);
  const interacted = useCoverageStore((s) => s.interacted);
  const viewEpoch = useCoverageStore((s) => s.viewEpoch);

  const setRig = useCoverageStore((s) => s.setRig);
  const updateCamera = useCoverageStore((s) => s.updateCamera);
  const selectCamera = useCoverageStore((s) => s.selectCamera);
  const setWorker = useCoverageStore((s) => s.setWorker);
  const selectWorker = useCoverageStore((s) => s.selectWorker);
  const setCoverage = useCoverageStore((s) => s.setCoverage);
  const setWorkerCoverage = useCoverageStore((s) => s.setWorkerCoverage);
  const setWorkerOperator = useCoverageStore((s) => s.setWorkerOperator);
  const markInteracted = useCoverageStore((s) => s.markInteracted);

  const machine = MACHINES[machineKey];
  const { camera: viewCamera, raycaster, gl } = useThree();
  const machineGroup = useRef<THREE.Group>(null);
  const drag = useRef<DragMode>(null);
  const ctxRef = useRef<CoverageContext | null>(null);

  const activeCameras = useMemo(
    () => effectiveCameras(cameras, machineKey, showAll),
    [cameras, machineKey, showAll],
  );

  /* ------------------------------------------------ throttled coverage solve */
  const lastSolve = useRef(0);
  const solveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const run = () => {
      lastSolve.current = performance.now();
      const ctx = buildContext(machineKey, activeCameras, rig);
      ctxRef.current = ctx;
      setCoverage(solveCoverage(ctx));
      const w = useCoverageStore.getState().workers;
      setWorkerCoverage(w.map(([wx, wz]) => coverageAt(ctx, wx, wz)));
      setWorkerOperator(w.map(([wx, wz]) => operatorSeesAt(ctx, wx, wz)));
    };
    const since = performance.now() - lastSolve.current;
    if (solveTimer.current) clearTimeout(solveTimer.current);
    if (since >= GRID.throttleMs) run();
    else solveTimer.current = setTimeout(run, GRID.throttleMs - since);
    return () => { if (solveTimer.current) clearTimeout(solveTimer.current); };
  }, [revision, machineKey, activeCameras, rig, setCoverage, setWorkerCoverage, setWorkerOperator]);

  // Moving a worker does not change coverage, so this only re-tests their cells.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    setWorkerCoverage(workers.map(([wx, wz]) => coverageAt(ctx, wx, wz)));
    setWorkerOperator(workers.map(([wx, wz]) => operatorSeesAt(ctx, wx, wz)));
  }, [workers, setWorkerCoverage, setWorkerOperator]);

  useEffect(() => { onReady?.(); }, [onReady]);

  // Put the orbit camera back where it started.
  //
  // OrbitControls has its own snapshot/restore for exactly this, and using it
  // avoids fighting the damping: setting camera.position by hand leaves the
  // controls' internal spherical state (radius included) out of step, so the view
  // came back on the right bearing but at the wrong distance. saveState() captures
  // the default framing once the controls exist; reset() restores it and clears
  // the in-flight interpolation.
  const savedView = useRef(false);
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    if (!savedView.current) {
      c.target.set(...CAMERA_VIEW.target);
      viewCamera.position.set(...CAMERA_VIEW.position);
      c.update();
      c.saveState();
      savedView.current = true;
      return;
    }
    c.reset();
  }, [viewEpoch, controlsRef, viewCamera]);

  /* --------------------------------------------------------------- dragging */
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const pointerNdc = useMemo(() => new THREE.Vector2(), []);

  /** Where the pointer ray meets the ground plane, or null if it points at the sky. */
  const pointerToGround = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerNdc, viewCamera);
      return raycaster.ray.intersectPlane(groundPlane, scratch) ? scratch.clone() : null;
    },
    [gl, raycaster, viewCamera, groundPlane, scratch, pointerNdc],
  );

  /** Raycasts the pointer against a specific rig node's rendered mesh. */
  const pointerToMount = useCallback(
    (clientX: number, clientY: number, mountName: string) => {
      if (!machineGroup.current) return null;
      const rect = gl.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerNdc, viewCamera);
      const hits = raycaster.intersectObject(machineGroup.current, true);
      const hit = hits.find((h) => h.object.name === mountName && h.face);
      if (!hit) return null;
      const mesh = hit.object as THREE.Mesh;
      // The mesh's local space IS the mount node's local space, which is the
      // frame camera positions are declared in.
      const local = mesh.worldToLocal(hit.point.clone());
      const n = hit.face!.normal.clone().normalize();
      return local.addScaledVector(n, MOUNT_STANDOFF);
    },
    [gl, raycaster, viewCamera, pointerNdc],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
    document.body.style.cursor = '';
  }, [controlsRef]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      e.preventDefault();

      if (d.kind === 'swing') {
        const p = pointerToGround(e.clientX, e.clientY);
        if (!p) return;
        // Both machines swing about a vertical axis through the origin.
        const angle = Math.atan2(p.x, p.z) / DEG;
        setRig({ swing: d.startValue + shortestDelta(d.startAngle, angle) });
      } else if (d.kind === 'arm') {
        setRig({ arm: d.startValue + (e.clientY - d.startY) * ARM_DRAG_SENSITIVITY });
      } else if (d.kind === 'camera') {
        const cam = useCoverageStore.getState().cameras.find((c) => c.id === d.id);
        if (!cam) return;
        const local = pointerToMount(e.clientX, e.clientY, cam.mount);
        if (local) updateCamera(d.id, { position: [local.x, local.y, local.z] as Vec3 });
      } else if (d.kind === 'worker') {
        const p = pointerToGround(e.clientX, e.clientY);
        if (p) setWorker(d.index, p.x, p.z);
      }
    };
    const up = () => endDrag();
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [pointerToGround, pointerToMount, setRig, updateCamera, setWorker, endDrag]);

  const beginDrag = useCallback(
    (mode: DragMode) => {
      drag.current = mode;
      markInteracted();
      if (controlsRef.current) controlsRef.current.enabled = false;
      document.body.style.cursor = 'grabbing';
    },
    [controlsRef, markInteracted],
  );

  const onPartPointerDown = useCallback(
    (part: 'swing' | 'arm', e: { stopPropagation: () => void; clientX: number; clientY: number }) => {
      e.stopPropagation();
      if (part === 'swing') {
        const p = pointerToGround(e.clientX, e.clientY);
        if (!p) return;
        beginDrag({
          kind: 'swing',
          startAngle: Math.atan2(p.x, p.z) / DEG,
          startValue: useCoverageStore.getState().rig.swing,
        });
      } else {
        beginDrag({ kind: 'arm', startY: e.clientY, startValue: useCoverageStore.getState().rig.arm });
      }
    },
    [beginDrag, pointerToGround],
  );

  const onGizmoPointerDown = useCallback(
    (id: string) => beginDrag({ kind: 'camera', id }),
    [beginDrag],
  );

  /* ------------------------------------------------------------ auto-rotate */
  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    const shouldSpin = !interacted && !reducedMotion;
    if (c.autoRotate !== shouldSpin) c.autoRotate = shouldSpin;
  });

  const armNode = machine.rig.type === 'slew' ? machine.rig.nodes.arm : machine.rig.nodes.arm;
  const swingNode = machine.rig.type === 'slew' ? machine.rig.nodes.rotating : machine.rig.nodes.front;
  const baseNode = machine.rig.type === 'slew' ? machine.rig.nodes.base : machine.rig.nodes.rear;
  const coverage = useCoverageStore((s) => s.coverage);
  const workerCoverage = useCoverageStore((s) => s.workerCoverage);
  const workerOperator = useCoverageStore((s) => s.workerOperator);
  const env = ENVIRONMENTS[environment];

  return (
    <>
      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        target={CAMERA_VIEW.target}
        minDistance={CAMERA_VIEW.minDistance}
        maxDistance={CAMERA_VIEW.maxDistance}
        minPolarAngle={CAMERA_VIEW.minPolarAngle}
        maxPolarAngle={CAMERA_VIEW.maxPolarAngle}
        autoRotateSpeed={CAMERA_VIEW.autoRotateSpeed}
        enablePan={false}
        onStart={markInteracted}
        // One finger orbits, two fingers zoom.
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />

      {/* Fades the far ground and any scenery into the page background, so the
          scene sits on the page rather than ending on a hard horizon line. */}
      <fog attach="fog" args={[COLORS.page, env.fog[0], env.fog[1]]} />

      {/* Soft neutral light, balanced per environment — equipment, not a game asset. */}
      <hemisphereLight args={[0xffffff, 0xcdd5dc, env.hemi]} />
      <ambientLight intensity={env.ambient} />
      <directionalLight
        position={[9, 14, 7]}
        intensity={env.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0012}
      />
      <directionalLight position={[-10, 7, -8]} intensity={0.35} />

      <Environment environment={environment} />

      <CoverageGround
        coverage={coverage}
        workingRadius={machine.workingRadius}
        visible={showGround}
      />
      <ContactShadows
        position={[0, 0.032, 0]}
        scale={26}
        blur={2.4}
        opacity={env.shadowOpacity}
        far={6}
        resolution={512}
      />

      <group ref={machineGroup}>
        <Machine machineKey={machineKey} rig={rig} onPartPointerDown={onPartPointerDown} />

        {/* Camera rigs live inside their mount node's group so they inherit its transform. */}
        <MountedRigs
          machineKey={machineKey}
          rig={rig}
          baseNode={baseNode}
          swingNode={swingNode}
          armNode={armNode}
          cameras={activeCameras}
          selectedId={selectedId}
          showFrusta={showFrusta}
          touch={touch}
          onSelect={selectCamera}
          onGizmoPointerDown={onGizmoPointerDown}
        />
      </group>

      <Workers
        positions={workers}
        coverage={workerCoverage}
        operatorSees={workerOperator}
        selectedId={selectedWorkerId}
        touch={touch}
        reducedMotion={reducedMotion}
        onSelect={selectWorker}
        onPointerDown={(index, e) => { e.stopPropagation(); beginDrag({ kind: 'worker', index }); }}
      />
    </>
  );
}

/** Wraps each camera in a group matching its mount node's articulation. */
function MountedRigs({
  machineKey,
  rig,
  baseNode,
  swingNode,
  armNode,
  cameras,
  selectedId,
  showFrusta,
  touch,
  onSelect,
  onGizmoPointerDown,
}: {
  machineKey: ReturnType<typeof useCoverageStore.getState>['machineKey'];
  rig: { swing: number; arm: number };
  baseNode: string;
  swingNode: string;
  armNode: string;
  cameras: ReturnType<typeof effectiveCameras>;
  selectedId: string | null;
  showFrusta: boolean;
  touch: boolean;
  onSelect: (id: string) => void;
  onGizmoPointerDown: (id: string) => void;
}) {
  const machine = MACHINES[machineKey];
  const armPivot = machine.pivots[armNode] as Vec3;
  const on = (node: string) => cameras.filter((c) => c.mount === node);

  const render = (list: typeof cameras) =>
    list.map((c) => (
      <CameraRig
        key={c.id}
        camera={c}
        selected={selectedId === c.id}
        showFrustum={showFrusta}
        touch={touch}
        onSelect={onSelect}
        onGizmoPointerDown={onGizmoPointerDown}
      />
    ));

  return (
    <group>
      {render(on(baseNode))}
      <group rotation={[0, rig.swing * DEG, 0]}>
        {render(on(swingNode))}
        <group position={armPivot} rotation={[rig.arm * DEG, 0, 0]}>
          {render(on(armNode))}
        </group>
      </group>
    </group>
  );
}

/** Wraps an angle delta into -180..180 so dragging past ±180° does not spin the house. */
function shortestDelta(from: number, to: number) {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export { clamp };
