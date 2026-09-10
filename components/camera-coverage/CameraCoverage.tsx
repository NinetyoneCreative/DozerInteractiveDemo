'use client';

/**
 * Canvas + UI shell.
 *
 * Owns the things that sit around the 3D scene: the WebGL capability check and
 * static fallback, the poster shown until the first frame, keyboard orbit and
 * articulation, and the off-screen summary a screen reader reads.
 */

import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CAMERA_VIEW, COLORS, ENVIRONMENTS, FALLBACK_COPY, FOV, MACHINES, RANGE, WORKERS } from './config';
import {
  ArticulationControls,
  FullscreenIcon,
  CameraControls,
  CameraEditControls,
  EnvironmentSwitch,
  MachineSwitch,
  SpecFootnote,
  StatsReadout,
  ViewControls,
} from './ControlPanel';
import { Machine } from './Machine';
import { Scene } from './Scene';
import { useCoverageStore } from './store';
import type { MachineKey } from './types';
import type { EnvironmentKey } from './config';

const DEG = Math.PI / 180;

function hasWebGL() {
  if (typeof window === 'undefined') return true;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Fullscreen for one element, with the Safari prefixes still in play.
 *
 * `supported` is false where the API is unavailable or disallowed — iOS Safari
 * has no Fullscreen API for non-video elements, and inside an iframe the host
 * must opt in with allow="fullscreen". The button is hidden rather than offered
 * and then silently doing nothing.
 */
interface FullscreenApi {
  supported: boolean;
  active: boolean;
  toggle: () => void;
}

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};

function useFullscreen(ref: React.RefObject<HTMLElement | null>): FullscreenApi {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const d = document as FsDocument;
    setSupported(Boolean(d.fullscreenEnabled ?? d.webkitFullscreenEnabled));
    const sync = () => setActive(Boolean(d.fullscreenElement ?? d.webkitFullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const d = document as FsDocument;
    const el = ref.current as FsElement | null;
    if (!el) return;
    const current = d.fullscreenElement ?? d.webkitFullscreenElement;
    if (current) {
      void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
    } else {
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      // Older Safari resolves nothing and Firefox rejects if the gesture is stale;
      // either way a failure should not blow up the render.
      Promise.resolve(req?.()).then(() => el.focus()).catch(() => {});
    }
  }, [ref]);

  return { supported, active, toggle };
}

/** Overlaying controls on the scene only makes sense when there is scene to spare. */
function useOverlayLayout() {
  const [overlay, setOverlay] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)');
    const update = () => setOverlay(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  return overlay;
}

function useCoarsePointer() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(pointer: coarse)');
    const update = () => setTouch(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  return touch;
}

export interface CameraCoverageProps {
  /** Machine to open on. Defaults to the excavator. */
  initialMachine?: MachineKey;
  /** Environment to open on. Defaults to the studio. */
  initialEnvironment?: EnvironmentKey;
  /**
   * Open on the full package (true) or on the single-camera comparison (false).
   * Defaults to the full package. Lets a host open straight onto the comparison
   * instead of asking the presenter to find the toggle mid-sentence.
   */
  initialShowAllCameras?: boolean;
  /**
   * Desktop height of the module, any CSS length. The embed route sizes itself
   * from this and reports it to the host page.
   */
  height?: string;
}

export default function CameraCoverage({
  initialMachine,
  initialEnvironment,
  initialShowAllCameras,
  height,
}: CameraCoverageProps = {}) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const touch = useCoarsePointer();
  const overlay = useOverlayLayout();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(sceneRef);

  useEffect(() => setWebgl(hasWebGL()), []);

  const initialize = useCoverageStore((s) => s.initialize);
  useEffect(() => {
    if (initialMachine || initialEnvironment || initialShowAllCameras !== undefined) {
      initialize({
        machine: initialMachine,
        environment: initialEnvironment,
        showAllCameras: initialShowAllCameras,
      });
    }
  }, [initialMachine, initialEnvironment, initialShowAllCameras, initialize]);

  const machineKey = useCoverageStore((s) => s.machineKey);
  const setRig = useCoverageStore((s) => s.setRig);
  const markInteracted = useCoverageStore((s) => s.markInteracted);
  const machine = MACHINES[machineKey];

  /* -------------------------------------------------- keyboard interaction */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // The controls are children of this element in the overlay layout, so their
      // key events bubble here. Without this, arrow keys inside a slider would
      // orbit the scene as well as move the slider.
      const t = e.target as HTMLElement | null;
      if (t && t !== e.currentTarget && t.closest('input, button, select, textarea, a[href]')) {
        return;
      }
      const c = controlsRef.current;
      const rig = useCoverageStore.getState().rig;
      const step = CAMERA_VIEW.keyOrbitStep * DEG;
      let handled = true;

      switch (e.key) {
        // Orbit
        case 'ArrowLeft': c?.setAzimuthalAngle(c.getAzimuthalAngle() - step); break;
        case 'ArrowRight': c?.setAzimuthalAngle(c.getAzimuthalAngle() + step); break;
        case 'ArrowUp': c?.setPolarAngle(clampPolar(c.getPolarAngle() - step)); break;
        case 'ArrowDown': c?.setPolarAngle(clampPolar(c.getPolarAngle() + step)); break;
        case '+': case '=': dolly(c, -CAMERA_VIEW.keyZoomStep); break;
        case '-': case '_': dolly(c, CAMERA_VIEW.keyZoomStep); break;
        // Articulate: [ ] swings, ; ' moves the arm
        case '[': setRig({ swing: rig.swing - 5 }); break;
        case ']': setRig({ swing: rig.swing + 5 }); break;
        case ';': setRig({ arm: rig.arm + 3 }); break;
        case "'": setRig({ arm: rig.arm - 3 }); break;
        case 'f': case 'F': if (fullscreen.supported) fullscreen.toggle(); break;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        markInteracted();
        c?.update();
      }
    },
    [setRig, markInteracted, fullscreen],
  );

  /* ------------------------------------------------------------- fallback */
  if (webgl === false) {
    return (
      <div className="rounded-card border border-dozer-muted/40 bg-dozer-card p-6">
        <Poster machineKey={machineKey} />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-dozer-muted">
          {FALLBACK_COPY.eyebrow}
        </p>
        <h3 className="mt-1 text-[20px] font-medium text-dozer-heading">{FALLBACK_COPY.title}</h3>
        <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-dozer-body">
          {FALLBACK_COPY.body}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{ ['--dozer-coverage-h' as string]: height ?? (overlay ? '800px' : '640px') }}
    >
      {/* ------------------------------------------------------------ scene */}
      <div
        tabIndex={0}
        role="application"
        aria-label={`Interactive 3D camera coverage for the ${machine.label}. Arrow keys orbit, plus and minus zoom, square brackets swing the machine, semicolon and apostrophe move the arm, F toggles full screen.`}
        onKeyDown={onKeyDown}
        ref={sceneRef}
        className={`relative overflow-hidden bg-dozer-page focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dozer-yellow ${
          fullscreen.active
            ? // The browser sizes the fullscreen element; an author height would win
              // over the UA rule and leave the scene letterboxed on screen.
              'h-screen w-screen rounded-none border-0'
            : 'aspect-[4/3] w-full rounded-card border border-dozer-muted/40 sm:aspect-video lg:aspect-auto lg:h-[var(--dozer-coverage-h)]'
        }`}
        style={{ touchAction: 'none' }}
      >
        {!ready ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-dozer-page">
            <Poster machineKey={machineKey} />
          </div>
        ) : null}

        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
          camera={{ position: CAMERA_VIEW.position, fov: CAMERA_VIEW.fov, near: 0.1, far: 400 }}
          onCreated={({ gl }) => { gl.setClearColor(COLORS.page); }}
        >
          <Suspense fallback={null}>
            <Scene
              controlsRef={controlsRef}
              reducedMotion={reducedMotion}
              touch={touch}
              onReady={() => setReady(true)}
            />
          </Suspense>
          <PreloadMachines />
        </Canvas>

        {overlay ? <SceneOverlay /> : <Legend floating />}
        <FullscreenButton fullscreen={fullscreen} touch={touch} />
        <ScreenReaderSummary />
      </div>

      {/* Phone and tablet: no spare canvas to float over, so the controls stack.
          Hidden in fullscreen, where only the scene element is on screen. */}
      {!overlay && !fullscreen.active ? (
        <StackedControls />
      ) : null}
    </div>
  );
}

/**
 * Phone and tablet layout. Split out only so it can read `selectedCameraId` —
 * the edit card renders nothing without a selection, and an empty Card around
 * nothing is a visible empty box.
 */
function StackedControls() {
  const selectedCameraId = useCoverageStore((s) => s.selectedCameraId);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card><StatsReadout /></Card>
      <div className="flex flex-col gap-3">
        <Card><MachineSwitch /></Card>
        <Card><EnvironmentSwitch /></Card>
        <Card><ArticulationControls /></Card>
        <Card><CameraControls /></Card>
        {selectedCameraId ? <Card><CameraEditControls /></Card> : null}
        <Card><ViewControls /></Card>
      </div>
      <div className="sm:col-span-2">
        <SpecFootnote />
      </div>
    </div>
  );
}

/**
 * Full-screen toggle, pinned to the bottom-right corner of the scene in both
 * layouts. Icon-only, so it carries its label on aria-label and title.
 *
 * Renders nothing where the API is unavailable — iOS Safari has none for
 * non-video elements, and inside an iframe the host must opt in with
 * allow="fullscreen". Better absent than present and inert.
 */
function FullscreenButton({ fullscreen, touch }: { fullscreen: FullscreenApi; touch: boolean }) {
  if (!fullscreen.supported) return null;
  const label = fullscreen.active ? 'Exit full screen' : 'View full screen';
  return (
    <button
      type="button"
      onClick={fullscreen.toggle}
      aria-label={label}
      aria-pressed={fullscreen.active}
      title={`${label} (F)`}
      className={`absolute bottom-3 right-3 z-20 grid place-items-center rounded-[6px] border border-dozer-muted/40 bg-dozer-card/92 text-dozer-heading shadow-sm backdrop-blur-md transition-colors hover:border-dozer-heading hover:text-dozer-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dozer-yellow ${
        touch ? 'h-11 w-11' : 'h-9 w-9'
      }`}
    >
      <FullscreenIcon exiting={fullscreen.active} size={touch ? 18 : 15} />
    </button>
  );
}

/** A translucent card. On the overlay it floats over the scene. */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const empty = children === null || children === undefined || children === false;
  if (empty) return null;
  return (
    <div
      className={`pointer-events-auto rounded-card border border-dozer-muted/40 bg-dozer-card/95 p-3 shadow-sm backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Desktop arrangement: the controls float on the edges of the scene rather than
 * sitting beside it, which gives the 3D the whole frame.
 *
 * The container ignores pointer events so orbiting still works everywhere the
 * cards are not; each card takes them back for itself.
 */
function SceneOverlay() {
  const selectedCameraId = useCoverageStore((s) => s.selectedCameraId);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-3">
      {/* top left — the payload */}
      <div className="absolute left-3 top-3 w-[248px]">
        <Card><StatsReadout /></Card>
      </div>

      {/* right rail — one scrollable column rather than two stacks growing towards
          each other, which collided as soon as the camera-edit card appeared */}
      <div className="absolute bottom-[3.5rem] right-3 top-3 flex w-[238px] flex-col gap-2.5 overflow-y-auto">
        <Card><MachineSwitch /></Card>
        <Card><EnvironmentSwitch /></Card>
        {selectedCameraId ? <Card><CameraEditControls /></Card> : null}
        <Card><CameraControls /></Card>
      </div>

      {/* bottom centre — move the machine */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <Card className="!px-4">
          <ArticulationControls />
        </Card>
      </div>

      {/* bottom left — the view switches live here rather than in the right rail,
          which could not hold them once the camera-edit card opened. Legend and the
          spec line stack under them; both need their own backing, since bare text
          over bright coverage is unreadable. */}
      <div className="absolute bottom-3 left-3 flex w-[248px] flex-col items-start gap-2">
        <Card className="w-full"><ViewControls /></Card>
        <Legend />
        <div className="rounded-[6px] bg-dozer-card/85 px-2 py-1 backdrop-blur-sm">
          <SpecFootnote />
        </div>
      </div>
    </div>
  );
}

/** Warms the other machine's GLB while the browser is idle, so switching is instant. */
function PreloadMachines() {
  useEffect(() => {
    const run = () => {
      import('@react-three/drei').then(({ useGLTF }) => {
        for (const m of Object.values(MACHINES)) useGLTF.preload(m.glb);
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 1200);
  }, []);
  return null;
}

/** Static poster, also the no-WebGL image. Inline SVG so it costs no request. */
function Poster({ machineKey }: { machineKey: keyof typeof MACHINES }) {
  return (
    <div className="flex w-full max-w-[520px] flex-col items-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/poster-${machineKey === 'excavator' ? 'excavator' : 'wheel-loader'}.png`}
        alt={`${MACHINES[machineKey].label} with its camera coverage shown on the ground`}
        className="w-full"
        width={520}
        height={292}
      />
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-dozer-muted">
        Loading 3D view…
      </p>
    </div>
  );
}

/**
 * `floating` pins it to the bottom-left of the scene, which is what the stacked
 * layout wants. The overlay places it inside its own bottom-left column instead,
 * so it flows above the spec line rather than landing on top of it.
 */
function Legend({ floating = false }: { floating?: boolean }) {
  return (
    <div
      className={`pointer-events-none z-10 flex flex-wrap gap-x-2.5 gap-y-1 self-start rounded-[6px] bg-dozer-card/85 px-2 py-1.5 backdrop-blur-sm sm:gap-x-4 sm:px-3 sm:py-2 ${
        floating ? 'absolute bottom-2 left-2 sm:bottom-3 sm:left-3' : ''
      }`}
    >
      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-dozer-body sm:gap-1.5 sm:text-[10px] sm:tracking-[0.1em]">
        <span
          className="inline-block h-2 w-2 rounded-[2px] sm:h-2.5 sm:w-2.5"
          style={{ backgroundColor: COLORS.operator }}
        />
        Operator sees
      </span>
      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-dozer-body sm:gap-1.5 sm:text-[10px] sm:tracking-[0.1em]">
        <span
          className="inline-block h-2 w-2 rounded-[2px] sm:h-2.5 sm:w-2.5"
          style={{ backgroundColor: COLORS.coverage }}
        />
        Cameras add
      </span>
      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-dozer-body sm:gap-1.5 sm:text-[10px] sm:tracking-[0.1em]">
        <span
          className="inline-block h-2 w-2 rounded-[2px] sm:h-2.5 sm:w-2.5"
          style={{ backgroundColor: COLORS.warning }}
        />
        Blind zone
      </span>
      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-dozer-body sm:gap-1.5 sm:text-[10px] sm:tracking-[0.1em]">
        <span className="inline-block h-2 w-2 rounded-full border border-dozer-muted sm:h-2.5 sm:w-2.5" />
        Working radius
      </span>
    </div>
  );
}

/** Off-screen prose summary of the current state, updated politely. */
function ScreenReaderSummary() {
  const machineKey = useCoverageStore((s) => s.machineKey);
  const coverage = useCoverageStore((s) => s.coverage);
  const cameras = useCoverageStore((s) => s.cameras);
  const showAll = useCoverageStore((s) => s.showAllCameras);
  const rig = useCoverageStore((s) => s.rig);
  const workerCoverage = useCoverageStore((s) => s.workerCoverage);
  const workerOperator = useCoverageStore((s) => s.workerOperator);
  const environment = useCoverageStore((s) => s.environment);
  const machine = MACHINES[machineKey];

  const text = useMemo(() => {
    if (!coverage) return 'Calculating camera coverage.';
    const operatorPct = Math.round(coverage.operatorFraction * 100);
    const cameraPct = Math.round(coverage.cameraOnlyFraction * 100);
    const pct = operatorPct + cameraPct;
    const active = showAll
      ? cameras.filter((c) => c.enabled)
      : cameras.filter((c) => c.id === machine.singleCameraId && c.enabled);
    const zones = coverage.blindZones;
    const swingWord = machine.rig.type === 'slew' ? 'slewed' : 'steered';

    return [
      `${machine.label}, ${swingWord} ${Math.round(rig.swing)} degrees, arm at ${Math.round(rig.arm)} degrees.`,
      `${active.length} of ${cameras.length} cameras active, each ${FOV.horizontal} degrees wide with a ${RANGE.effective} metre effective range.`,
      `${pct} percent of the ground between the ${machine.footprintRadius} metre machine footprint and the ${machine.workingRadius} metre working radius is covered: ${operatorPct} percent the operator can see directly from the cab, and a further ${cameraPct} percent only the cameras reach. ${Math.max(0, 100 - pct)} percent is seen by neither.`,
      'Direct sight is a modelled seated arc, not a measured visibility study.',
      zones.length
        ? `Blind zones: ${zones.map((z) => `${z.sector}, nearest edge ${z.distance.toFixed(1)} metres, ${z.area.toFixed(0)} square metres`).join('; ')}.`
        : 'No blind zone larger than 1.5 square metres inside the working radius.',
      `Environment: ${ENVIRONMENTS[environment].label}. Scenery only; it does not affect the coverage figure.`,
      (() => {
        const isSeen = (i: number) => (workerOperator[i] ?? false) || (workerCoverage[i] ?? 0) > 0;
        const seenCount = WORKERS.filter((_, i) => isSeen(i)).length;
        const unseen = WORKERS.filter((_, i) => !isSeen(i)).map((w) => w.label);
        const onCameraOnly = WORKERS
          .filter((_, i) => !(workerOperator[i] ?? false) && (workerCoverage[i] ?? 0) > 0)
          .map((w) => w.label);
        const cameraLine = onCameraOnly.length
          ? ` Visible only on camera, not from the cab: ${onCameraOnly.join(', ')}.`
          : '';
        return (unseen.length === 0
          ? `All ${WORKERS.length} workers are seen.`
          : `${seenCount} of ${WORKERS.length} workers are seen. Standing where neither the operator nor a camera can see them: ${unseen.join(', ')}.`) + cameraLine;
      })(),
    ].join(' ');
  }, [coverage, cameras, showAll, rig, machine, workerCoverage, workerOperator, environment]);

  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}

function clampPolar(a: number) {
  return Math.min(CAMERA_VIEW.maxPolarAngle, Math.max(CAMERA_VIEW.minPolarAngle, a));
}

function dolly(c: OrbitControlsImpl | null, amount: number) {
  if (!c) return;
  const dir = c.object.position.clone().sub(c.target);
  const len = THREE.MathUtils.clamp(dir.length() + amount, CAMERA_VIEW.minDistance, CAMERA_VIEW.maxDistance);
  c.object.position.copy(c.target).add(dir.setLength(len));
}

export { Machine };
