'use client';

/**
 * Module state.
 *
 * Local state got messy once the panel, the gizmos and the solver all needed to
 * read and write the same camera list, so this is the small zustand store the
 * brief allows for exactly that case.
 */

import { create } from 'zustand';
import { CAMERA_EDIT_LIMITS, MACHINES, WORKER, WORKERS } from './config';
import type { EnvironmentKey } from './config';
import { clamp, defaultCameraState, defaultRigState } from './coverage';
import type { CameraState, CoverageResult, MachineKey, RigState, Vec3, WorkerPos } from './types';

interface CoverageStore {
  machineKey: MachineKey;
  rig: RigState;
  cameras: CameraState[];
  selectedCameraId: string | null;
  /** "All cameras" off = the single-camera comparison. */
  showAllCameras: boolean;
  showGround: boolean;
  showFrusta: boolean;
  /** Which scene dressing is on. Never affects the coverage solve. */
  environment: EnvironmentKey;
  /** Worker positions on the ground plane, world XZ, parallel to config WORKERS. */
  workers: WorkerPos[];
  /** Which worker the panel is highlighting, or null. */
  selectedWorkerId: string | null;
  coverage: CoverageResult | null;
  /** Cameras that can see each worker right now. 0 = standing in a blind zone. */
  workerCoverage: number[];
  /** Bumped whenever the solver needs to run again. */
  revision: number;
  /** Bumped by reset() so the scene knows to put the orbit camera back. */
  viewEpoch: number;
  /** True once the user has touched anything — kills auto-rotate for good. */
  interacted: boolean;

  setMachine: (key: MachineKey) => void;
  setRig: (next: Partial<RigState>) => void;
  updateCamera: (id: string, patch: Partial<CameraState>) => void;
  selectCamera: (id: string | null) => void;
  toggleCamera: (id: string) => void;
  setShowAllCameras: (v: boolean) => void;
  setShowGround: (v: boolean) => void;
  setShowFrusta: (v: boolean) => void;
  setEnvironment: (e: EnvironmentKey) => void;
  /**
   * Sets the starting machine and environment without counting as user input, so
   * an embed can open on a chosen configuration and still auto-rotate until the
   * visitor actually touches it.
   */
  initialize: (opts: { machine?: MachineKey; environment?: EnvironmentKey }) => void;
  setWorker: (index: number, x: number, z: number) => void;
  selectWorker: (id: string | null) => void;
  setCoverage: (c: CoverageResult) => void;
  setWorkerCoverage: (n: number[]) => void;
  markInteracted: () => void;
  reset: () => void;
}

function initial(key: MachineKey) {
  return {
    machineKey: key,
    rig: defaultRigState(key),
    cameras: defaultCameraState(key),
    selectedCameraId: null,
    showAllCameras: true,
    showGround: true,
    showFrusta: true,
    workers: WORKERS.map((w) => [...w.start] as WorkerPos),
    selectedWorkerId: null,
    coverage: null,
    workerCoverage: WORKERS.map(() => 0),
    revision: 0,
  };
}

export const useCoverageStore = create<CoverageStore>((set) => ({
  ...initial('excavator'),
  environment: 'studio',
  interacted: false,
  viewEpoch: 0,

  // Note: viewEpoch is deliberately NOT bumped here. Switching machines keeps
  // the user's orbit position rather than snapping the camera back.
  setMachine: (key) =>
    set((s) => ({
      ...initial(key),
      environment: s.environment,
      interacted: s.interacted,
      viewEpoch: s.viewEpoch,
      revision: s.revision + 1,
    })),

  setRig: (next) =>
    set((s) => {
      const l = MACHINES[s.machineKey].limits;
      const rig: RigState = {
        swing: clamp(next.swing ?? s.rig.swing, l.swing.min, l.swing.max),
        arm: clamp(next.arm ?? s.rig.arm, l.arm.min, l.arm.max),
      };
      return { rig, revision: s.revision + 1, interacted: true };
    }),

  updateCamera: (id, patch) =>
    set((s) => ({
      cameras: s.cameras.map((c) => {
        if (c.id !== id) return c;
        const next: CameraState = { ...c, ...patch };
        next.yaw = clamp(next.yaw, CAMERA_EDIT_LIMITS.yaw.min, CAMERA_EDIT_LIMITS.yaw.max);
        next.pitch = clamp(next.pitch, CAMERA_EDIT_LIMITS.pitch.min, CAMERA_EDIT_LIMITS.pitch.max);
        next.hFov = clamp(next.hFov, CAMERA_EDIT_LIMITS.hFov.min, CAMERA_EDIT_LIMITS.hFov.max);
        // Keep the vertical FOV in step with the sensor's aspect ratio.
        next.vFov = clamp((next.hFov * c.vFov) / c.hFov, 10, 120);
        return next;
      }),
      revision: s.revision + 1,
      interacted: true,
    })),

  selectCamera: (id) => set({ selectedCameraId: id, interacted: true }),

  toggleCamera: (id) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
      revision: s.revision + 1,
      interacted: true,
    })),

  setShowAllCameras: (v) => set((s) => ({ showAllCameras: v, revision: s.revision + 1, interacted: true })),
  setShowGround: (v) => set({ showGround: v, interacted: true }),
  setShowFrusta: (v) => set({ showFrusta: v, interacted: true }),

  setEnvironment: (environment) => set({ environment, interacted: true }),

  initialize: ({ machine, environment }) =>
    set((s) => ({
      ...(machine && machine !== s.machineKey
        ? { ...initial(machine), viewEpoch: s.viewEpoch }
        : {}),
      ...(environment ? { environment } : {}),
      interacted: s.interacted,
      revision: s.revision + 1,
    })),

  setWorker: (index, x, z) =>
    set((s) => {
      const d = Math.hypot(x, z);
      const k = d > WORKER.maxRadius ? WORKER.maxRadius / d : 1;
      const workers = s.workers.slice();
      workers[index] = [x * k, z * k];
      return { workers, interacted: true };
    }),

  selectWorker: (selectedWorkerId) => set({ selectedWorkerId, interacted: true }),

  setCoverage: (coverage) => set({ coverage }),
  setWorkerCoverage: (workerCoverage) => set({ workerCoverage }),
  markInteracted: () => set({ interacted: true }),

  // Resets the machine, the cameras AND the orbit position — the button says
  // "Reset view and cameras", so it has to do both.
  // Resets the machine, the cameras, the workers AND the orbit position. The
  // chosen environment survives — it is scene dressing, not module state.
  reset: () =>
    set((s) => ({
      ...initial(s.machineKey),
      environment: s.environment,
      interacted: s.interacted,
      revision: s.revision + 1,
      viewEpoch: s.viewEpoch + 1,
    })),
}));

/**
 * The cameras the solver and the scene should actually use.
 * In single-camera mode everything but the comparison camera is switched off.
 */
export function effectiveCameras(cameras: CameraState[], machineKey: MachineKey, showAll: boolean): CameraState[] {
  if (showAll) return cameras;
  const only = MACHINES[machineKey].singleCameraId;
  return cameras.map((c) => ({ ...c, enabled: c.id === only && c.enabled }));
}

export type { Vec3 };
