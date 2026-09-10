/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH for the camera-coverage module.
 * ============================================================================
 *
 * Everything tunable lives here. Nothing in the components hard-codes a metre,
 * a degree or a colour.
 *
 * Anything marked  // PLACEHOLDER  is NOT confirmed by the hardware side yet.
 *
 * Coordinate convention (also in types.ts):
 *   +X machine right, +Y up, +Z machine forward. Ground plane at y = 0.
 *   Yaw 0 = machine forward (+Z), positive = clockwise from above.
 *   Pitch 0 = level, negative = looking down.
 */

import type { MachineConfig, MachineKey } from './types';

/* ---------------------------------------------------------------- optics --*/

/**
 * Sensor field of view, degrees. Confirmed hardware spec: 110 (H) x 80 (V) x 120 (D).
 *
 * The solver uses `horizontal` and `vertical` — those two define the rectangular
 * frustum, and the diagonal follows from them. `diagonal` is carried here only so
 * the full spec is on the record and nobody has to guess which of the three
 * numbers a given figure refers to.
 *
 * Note the diagonal implied by 110 x 80 on a rectilinear lens is 117.8, not 120:
 *
 *   tan(D/2) = hypot(tan(H/2), tan(V/2))  ->  117.8 for 110 x 80
 *
 * A 2.2 degree difference is ordinary spec-sheet rounding on a wide-angle optic
 * with some barrel distortion. It is not an error to "fix" by widening H or V —
 * doing so would overstate coverage.
 */
export const FOV = { horizontal: 110, vertical: 80, diagonal: 120 };

/**
 * Detection range, metres.
 *   effective — where the module claims usable detection
 *   max       — where the frustum is drawn out to, fully faded
 * PLACEHOLDER — both figures are unconfirmed and await the hardware side.
 */
export const RANGE = { effective: 15, max: 25 }; // PLACEHOLDER, metres, unconfirmed

/** Bounds the yaw / pitch / FOV sliders in the panel. */
export const CAMERA_EDIT_LIMITS = {
  yaw: { min: -180, max: 180, step: 1 },
  pitch: { min: -80, max: 10, step: 1 },
  hFov: { min: 40, max: 140, step: 1 },
};

/* -------------------------------------------------- coverage solver tuning -*/

export const GRID = {
  /** Ground patch the solver evaluates, metres. Centred on the machine. */
  extent: 40,
  /**
   * Cell size, metres. 0.25 over 40 m = 160 × 160 = 25,600 cells, which is what
   * gives the zone edges their definition. A full solve at this resolution is
   * ~7 ms — finer than the original 0.5 m grid and still faster, because the
   * occlusion loop no longer builds a string key per box per ray.
   */
  cell: 0.25,
  /**
   * Minimum area before a gap is worth naming, m². Below this it is grid noise
   * rather than a blind zone a person could stand in.
   */
  minBlindZoneArea: 1.5,
  /** How many named blind zones the readout lists at once. */
  maxNamedZones: 3,
  /** Milliseconds between solves while the user is dragging. */
  throttleMs: 90,
};

/** Height above the ground plane at which coverage is sampled. */
export const SAMPLE_HEIGHT = 0.0;

export const OCCLUSION = {
  /**
   * Collider boxes within this distance of a lens are treated as the camera's own
   * mounting structure and do not block it, metres.
   *
   * Why this exists: the colliders are 0.4 m voxels, and a camera bracketed to a
   * deck sits inside or against the voxel it is bolted to. Without this, a unit
   * mounted flush on the counterweight is blinded by the counterweight. Real
   * installs use a stand-off bracket positioned so the bodywork it is bolted to is
   * not in the lens. The figure is deliberately a little larger than one voxel so
   * the immediate neighbours go with it; everything beyond — the far side of the
   * house, the tracks, the boom — still occludes normally.
   */
  mountClearance: 0.75,
};

/**
 * The draggable jobsite workers.
 *
 * Each one's seen / not-seen state is evaluated at its feet with exactly the same
 * function the ground grid uses, so a worker can never disagree with the coverage
 * drawn underneath it — including when it is standing in a seam.
 *
 * Starting positions are deliberately spread so that on both machines at least
 * one worker begins in a blind zone and at least one begins covered.
 */
export const WORKER = {
  height: 1.8, // metres — human scale reference
  /** Keeps a worker inside the solved grid. */
  maxRadius: 19,
};

export const WORKERS: { id: string; label: string; start: [number, number] }[] = [
  { id: 'w1', label: 'Worker 1', start: [7.6, 3.4] },
  { id: 'w2', label: 'Worker 2', start: [-1.4, 8.2] },
  { id: 'w3', label: 'Worker 3', start: [-6.8, -5.2] },
  { id: 'w4', label: 'Worker 4', start: [4.2, -7.4] },
];

/* ------------------------------------------------------------ scene / look -*/

export const COLORS = {
  /**
   * Coverage is neon blue. It is a signal colour, not a brand colour: it has to
   * stay legible on a pale studio floor, dark asphalt and mid-brown dirt alike,
   * which brand yellow does not. Brand yellow stays on the UI chrome (active
   * buttons, slider thumbs) so the panel still reads as Dozer.
   */
  coverage: '#00e5ff',
  /** Coverage where several cameras overlap — lifts towards white, not a new hue. */
  coverageOverlap: '#a8f4ff',
  yellow: '#fdac13',
  page: '#f4f7f9',
  heading: '#4d5260',
  body: '#5c6374',
  muted: '#a7aab1',
  card: '#ffffff',
  /** Warning tone for uncovered ground. Warm, so it reads as the opposite of the blue. */
  warning: '#ff6b3d',
  /** Hi-vis vest on the workers. */
  hiVis: '#d8f000',
  grid: '#d3dae0',
};

export const COVERAGE_STYLE = {
  /** Alpha of a cell seen by exactly one camera. */
  coveredAlpha: 0.24,
  /** Extra alpha per additional overlapping camera, so overlap reads brighter. */
  overlapAlphaStep: 0.11,
  coveredAlphaMax: 0.48,
  /** Alpha of an uncovered cell inside the working radius. */
  blindAlpha: 0.28,
  /**
   * Draws a hard rim on every boundary between covered and uncovered ground.
   * With this off the zones read as a soft wash; with it on the seams have an
   * actual edge, which is the point of the whole drawing.
   */
  edgeAlpha: 0.82,
  /** How far the rim is lifted towards white. */
  edgeLift: 0.24,
  /** Frustum wedge opacity at the lens, fading to 0 at RANGE.max. */
  frustumAlpha: 0.09,
  /** Segments along the frustum length — more = smoother fade. */
  frustumSegments: 10,
};

/* ---------------------------------------------------------- environments --*/

/**
 * Scene dressing. Each environment changes the ground surface, the light balance
 * and the props around the machine.
 *
 * IMPORTANT: environment geometry is scenery only. The coverage solve considers
 * the machine and nothing else, so switching environments never changes the
 * percentage — the claim stays about the camera package, not about where you
 * happened to park a cone. Props are kept outside the working radius wherever a
 * real one would genuinely block a lens.
 */
export const ENVIRONMENTS = {
  studio: {
    label: 'Studio',
    blurb: 'Neutral floor, nothing in the way.',
    ground: '#e7ecf0',
    groundRoughness: 0.95,
    /** Procedural surface pattern, drawn to a canvas at runtime. */
    surface: 'plain' as const,
    showGrid: true,
    ambient: 0.5,
    hemi: 1.5,
    key: 1.55,
    shadowOpacity: 0.42,
    /** Fades the far ground into the page background rather than ending on a hard edge. */
    fog: [42, 105] as [number, number],
  },
  street: {
    label: 'Street',
    blurb: 'Sealed road, live lane alongside.',
    ground: '#4c5057',
    groundRoughness: 0.88,
    surface: 'asphalt' as const,
    showGrid: false,
    ambient: 0.58,
    hemi: 1.25,
    key: 1.7,
    shadowOpacity: 0.5,
    fog: [30, 82] as [number, number],
  },
  dirt: {
    label: 'Dirt workzone',
    blurb: 'Graded earth, spoil and barriers.',
    ground: '#9c8163',
    groundRoughness: 1,
    surface: 'dirt' as const,
    showGrid: false,
    ambient: 0.55,
    hemi: 1.35,
    key: 1.7,
    shadowOpacity: 0.46,
    fog: [30, 84] as [number, number],
  },
  urban: {
    label: 'Urban',
    blurb: 'Kerbed street between buildings.',
    ground: '#51555c',
    groundRoughness: 0.85,
    surface: 'asphalt' as const,
    showGrid: false,
    ambient: 0.6,
    hemi: 1.2,
    key: 1.5,
    shadowOpacity: 0.52,
    fog: [26, 74] as [number, number],
  },
};

export type EnvironmentKey = keyof typeof ENVIRONMENTS;
export const ENVIRONMENT_KEYS = Object.keys(ENVIRONMENTS) as EnvironmentKey[];

export const CAMERA_VIEW = {
  /** Starting orbit position, metres. */
  position: [12.5, 8.6, 14] as [number, number, number],
  target: [0, 1.2, 0] as [number, number, number],
  fov: 38,
  minDistance: 8,
  maxDistance: 44,
  /** Stops just above the horizon so the user can never get under the ground plane. */
  maxPolarAngle: Math.PI / 2 - 0.035,
  minPolarAngle: 0.12,
  autoRotateSpeed: 0.35,
  /** Degrees per arrow-key press for keyboard orbit. */
  keyOrbitStep: 4,
  keyZoomStep: 1.5,
};

/* ------------------------------------------------------------------ rigs --*/

/**
 * Yaw convention: 0 = machine forward (+Z), positive = clockwise from above.
 *
 * Both machines run 3 cameras at 110 degrees horizontal = 330 of 360, leaving
 * three seams. That is intentional and accepted.
 *
 * The seams are wider than the nominal 10 degrees, because the cameras sit metres
 * apart rather than co-located at the machine centre: where two wedges meet, their
 * edge rays are offset by the mount separation and leave a sliver neither camera
 * sees. Measured from the machine centre the excavator shows roughly 15, 20 and
 * 22 degrees at 8 m, and machine geometry widens them further at close range.
 *
 * Render the seams as solved. Do not pad, round up, or smooth them over.
 *
 * `pivots` mirror the node translations baked into the GLB files. The solver
 * needs them to build node world transforms without waiting on the loader; if
 * you swap a GLB, these must match the new file (see README).
 *
 * `colliders` are simplified boxes in each node's LOCAL space, derived from the
 * split geometry. They are what the occlusion raycast uses — never the full
 * GLB mesh.
 */
export const MACHINES: Record<MachineKey, MachineConfig> = {
  excavator: {
    label: 'Excavator',
    glb: '/models/excavator.glb',
    rig: { type: 'slew', nodes: { base: 'tracks', rotating: 'house', arm: 'boom' } },
    workingRadius: 15,
    footprintRadius: 2.8, // tracks reach 2.3 m aft / 1.7 m fore of the slew axis, counterweight 2.53 m
    cameras: [
      // Mount positions are given in the mount node's local space. The house
      // node's origin is the slew axis at ground level, so `y` reads directly as
      // height above the ground and `z` as distance fore/aft of the slew centre.
      { id: 'rear',  label: 'Rear / counterweight', mount: 'house', position: [0, 2.28, -2.15],   yaw: 180, pitch: -35 }, // PLACEHOLDER position — spec proposed [0, 2.9, -2.2]; lowered to the engine-deck surface (y≈2.16) so the unit sits on the machine
      { id: 'left',  label: 'Front left',           mount: 'house', position: [-1.05, 2.26, 0.6], yaw: -60, pitch: -30 }, // PLACEHOLDER position — spec proposed [-1.3, 2.7, 0.6]; moved onto the left deck corner (surface y≈2.14, deck edge x≈-1.2)
      { id: 'right', label: 'Front right',          mount: 'house', position: [1.0, 2.75, 0.6],   yaw: 60,  pitch: -30 }, // PLACEHOLDER position — spec proposed [1.3, 2.7, 0.6]; the house ends at x≈1.11, so moved inboard onto the raised right deck (surface y≈2.63)
    ],
    // Seams at 0, 120, 240. The forward seam sits where the operator has direct
    // sight over the boom. All three cameras ride the house, so slewing sweeps the
    // entire coverage pattern and the seams travel with it.
    pivots: {
      tracks: [0, 0, 0],
      house: [0, 0, 0],        // slew axis, at ground level
      boom: [0, 2.57, 1.014],  // boom foot pin, relative to the house
    },
    limits: {
      swing: { min: -180, max: 180, rest: 0 },
      arm: { min: -26, max: 14, rest: 0 }, // PLACEHOLDER — visual range, not the machine's real boom envelope
    },
    colliders: {
      tracks: [
        { center: [-0.941, 0.4, -1.896], size: [1.2, 1.2, 0.4] },
        { center: [-1.141, 0.4, 0.104], size: [0.8, 1.2, 3.6] },
        { center: [-0.541, 0.8, -2.296], size: [2.0, 0.4, 0.4] },
        { center: [-1.141, 1.2, -2.096], size: [0.8, 0.4, 0.8] },
        { center: [-1.341, 1.2, -0.496], size: [0.4, 0.4, 2.4] },
        { center: [-0.341, 1.2, 0.504], size: [1.6, 0.4, 0.4] },
        { center: [0.259, 0.6, -0.296], size: [2.0, 0.8, 2.0] },
        { center: [-0.541, 0.6, 0.904], size: [0.4, 0.8, 0.4] },
        { center: [0.259, 0.8, -1.496], size: [2.0, 0.4, 0.4] },
        { center: [0.259, 1.2, 0.104], size: [2.0, 0.4, 0.4] },
        { center: [0.459, 0.8, -1.896], size: [1.6, 0.4, 0.4] },
        { center: [0.659, 1.0, 0.904], size: [1.2, 0.8, 0.4] },
        { center: [0.859, 0.2, -1.696], size: [0.8, 0.8, 0.8] },
        { center: [0.859, 0.0, 0.304], size: [0.8, 0.4, 3.2] },
        { center: [0.859, 0.4, 1.304], size: [0.8, 0.4, 1.2] },
        { center: [0.859, 0.8, 1.504], size: [0.8, 0.4, 0.8] },
        { center: [1.059, 1.0, -2.296], size: [0.4, 0.8, 0.4] },
        { center: [1.059, 1.2, -1.096], size: [0.4, 0.4, 2.0] },
        { center: [1.059, 1.2, 0.504], size: [0.4, 0.4, 0.4] },
        { center: [1.459, 0.4, 0.504], size: [0.4, 0.4, 0.4] },
      ],
      house: [
        { center: [-0.14, 0.955, -2.335], size: [2.8, 0.4, 0.8] },
        { center: [-1.34, 1.355, -0.935], size: [0.4, 1.2, 2.0] },
        { center: [-0.54, 1.155, 0.265], size: [2.0, 0.8, 0.4] },
        { center: [-0.94, 1.355, 0.665], size: [1.2, 1.2, 0.4] },
        { center: [-1.14, 1.555, -2.135], size: [0.8, 0.8, 0.4] },
        { center: [-0.94, 1.555, -1.335], size: [0.4, 1.6, 0.4] },
        { center: [0.06, 1.555, -2.535], size: [2.4, 0.8, 0.4] },
        { center: [-0.94, 1.755, -1.735], size: [0.4, 1.2, 0.4] },
        { center: [0.06, 1.555, -0.935], size: [2.4, 0.8, 0.4] },
        { center: [0.06, 1.355, -0.335], size: [2.4, 0.4, 0.8] },
        { center: [-0.74, 1.755, -0.135], size: [0.8, 0.4, 1.2] },
        { center: [-0.14, 2.155, -2.135], size: [2.0, 0.4, 0.4] },
        { center: [-0.74, 2.155, -0.935], size: [0.8, 0.4, 0.4] },
        { center: [-0.94, 2.355, -0.135], size: [0.4, 0.8, 1.2] },
        { center: [0.06, 2.155, 0.665], size: [2.4, 0.4, 0.4] },
        { center: [-0.14, 0.955, -0.935], size: [1.2, 0.4, 0.4] },
        { center: [-0.54, 0.955, -0.335], size: [0.4, 0.4, 0.8] },
        { center: [0.26, 1.755, -2.135], size: [2.0, 0.4, 0.4] },
        { center: [-0.34, 1.955, -1.535], size: [0.8, 0.8, 0.8] },
        { center: [-0.54, 2.155, -2.535], size: [0.4, 0.4, 0.4] },
        { center: [-0.14, 2.355, 1.065], size: [1.2, 0.8, 0.4] },
        { center: [0.46, 0.955, -0.135], size: [1.6, 0.4, 0.4] },
        { center: [0.46, 1.555, 0.665], size: [1.6, 0.8, 0.4] },
        { center: [0.06, 1.955, 0.065], size: [0.8, 0.8, 0.8] },
        { center: [0.46, 2.555, 0.465], size: [1.6, 0.4, 0.8] },
        { center: [0.06, 2.955, 0.465], size: [0.8, 0.4, 0.8] },
        { center: [-0.14, 3.155, 1.065], size: [0.4, 0.8, 0.4] },
        { center: [0.06, 3.355, 0.665], size: [0.8, 0.4, 0.4] },
        { center: [0.26, 0.955, -0.535], size: [0.4, 0.4, 0.4] },
        { center: [0.66, 0.955, 0.665], size: [1.2, 0.4, 0.4] },
        { center: [0.66, 1.755, -1.335], size: [1.2, 0.4, 0.4] },
        { center: [0.66, 2.155, -0.535], size: [1.2, 1.2, 0.4] },
        { center: [0.46, 2.155, -1.335], size: [0.8, 0.4, 1.2] },
        { center: [0.66, 2.555, -0.135], size: [1.2, 0.4, 0.4] },
        { center: [0.26, 3.355, 1.065], size: [0.4, 0.4, 0.4] },
        { center: [0.86, 1.355, 0.265], size: [0.8, 0.4, 0.4] },
        { center: [0.86, 1.755, -1.735], size: [0.8, 0.4, 0.4] },
        { center: [0.66, 2.755, -0.935], size: [0.4, 0.8, 0.4] },
        { center: [1.06, 1.155, -1.535], size: [0.4, 0.8, 0.8] },
        { center: [1.06, 0.955, -0.735], size: [0.4, 0.4, 0.8] },
        { center: [1.06, 0.955, 0.265], size: [0.4, 0.4, 0.4] },
        { center: [1.06, 1.355, -2.135], size: [0.4, 0.4, 0.4] },
        { center: [1.06, 1.955, 0.065], size: [0.4, 0.8, 0.8] },
        { center: [1.06, 2.155, -0.935], size: [0.4, 0.4, 0.4] },
      ],
      boom: [
        { center: [-0.008, -2.547, 2.722], size: [1.6, 0.4, 0.8] },
        { center: [-0.208, -2.547, 3.522], size: [1.2, 0.4, 0.8] },
        { center: [-0.608, -2.147, 3.122], size: [0.4, 0.4, 1.6] },
        { center: [-0.608, -1.747, 3.322], size: [0.4, 0.4, 1.2] },
        { center: [-0.208, 0.253, 0.122], size: [1.2, 1.2, 0.4] },
        { center: [-0.208, 0.453, 0.522], size: [1.2, 0.8, 0.4] },
        { center: [-0.008, -1.747, 3.722], size: [0.8, 1.2, 0.4] },
        { center: [-0.008, -0.147, 3.322], size: [0.8, 3.6, 0.4] },
        { center: [-0.008, -0.147, 2.922], size: [0.8, 2.8, 0.4] },
        { center: [-0.208, 0.253, 3.722], size: [0.4, 2.8, 0.4] },
        { center: [-0.008, 0.653, 1.122], size: [0.8, 1.2, 0.8] },
        { center: [-0.008, 0.653, -0.278], size: [0.8, 0.4, 0.4] },
        { center: [-0.008, 0.853, 2.122], size: [0.8, 0.8, 1.2] },
        { center: [-0.008, 1.053, 0.322], size: [0.8, 0.4, 0.8] },
        { center: [-0.008, 1.453, 2.322], size: [0.8, 0.4, 0.8] },
        { center: [-0.208, 1.453, 2.922], size: [0.4, 0.4, 0.4] },
        { center: [0.392, -2.147, 2.722], size: [0.8, 0.4, 0.8] },
        { center: [0.192, -2.147, 3.322], size: [0.4, 0.4, 0.4] },
        { center: [0.192, -1.747, 2.922], size: [0.4, 0.4, 0.4] },
        { center: [0.192, 0.453, 3.722], size: [0.4, 2.4, 0.4] },
      ],
    },
    singleCameraId: 'right',
  },

  wheelLoader: {
    label: 'Wheel loader',
    glb: '/models/wheel-loader.glb',
    rig: { type: 'articulated', nodes: { rear: 'chassis_rear', front: 'chassis_front', arm: 'loader_arms' } },
    workingRadius: 12,
    footprintRadius: 4.0, // 7.6 m long with the bucket down, measured from the centre joint
    cameras: [
      // chassis_front and chassis_rear both have their origin on the centre
      // articulation joint at ground level, so `y` reads as height above ground.
      { id: 'front',      label: 'Front',      mount: 'chassis_front', position: [0, 2.95, 0.5],      yaw: 0,    pitch: -30 }, // PLACEHOLDER position — spec proposed [0, 2.6, 2.8]; z=2.8 is past the front frame entirely (it ends at z≈2.46, where the frame is only y≈0.9), so this sits on top of the lift-arm tower, the highest forward-facing point on the steering frame
      { id: 'rear-left',  label: 'Rear left',  mount: 'chassis_rear',  position: [-1.2, 2.52, -2.2],  yaw: -120, pitch: -32 }, // PLACEHOLDER position — spec proposed [-1.2, 2.6, -2.2]; dropped 0.08 m onto the rear fender surface (y≈2.40)
      { id: 'rear-right', label: 'Rear right', mount: 'chassis_rear',  position: [1.2, 2.52, -2.2],   yaw: 120,  pitch: -32 }, // PLACEHOLDER position — spec proposed [1.2, 2.6, -2.2]; dropped 0.08 m onto the rear fender surface (y≈2.40)
    ],
    // Front camera rides chassis_front, rear pair rides chassis_rear. Steering swings
    // the forward arc independently, so the two forward seams open and close
    // asymmetrically. At full articulation the inside-of-turn seam widens noticeably.
    // This is real and must be visible.
    pivots: {
      chassis_rear: [0, 0, 0],
      chassis_front: [0, 0, 0],    // steering axis, at ground level
      loader_arms: [0, 2.035, 0.36], // lift-arm pivot pin, relative to the front chassis
    },
    limits: {
      swing: { min: -38, max: 38, rest: 0 }, // PLACEHOLDER — typical articulation is ±40°, unconfirmed for the target machine
      arm: { min: -22, max: 6, rest: 0 },    // PLACEHOLDER — visual range, not the machine's real lift envelope
    },
    colliders: {
      chassis_rear: [
        { center: [-1.204, 0.806, -1.881], size: [0.8, 2.0, 1.2] },
        { center: [-1.204, 0.806, -2.681], size: [0.8, 1.2, 0.4] },
        { center: [-0.004, 1.006, -1.081], size: [3.2, 1.6, 0.4] },
        { center: [-1.004, 2.006, -1.681], size: [1.2, 0.4, 0.8] },
        { center: [-0.004, 1.206, -3.681], size: [2.4, 1.2, 0.8] },
        { center: [-0.004, 0.806, -3.081], size: [2.4, 0.4, 0.4] },
        { center: [-0.804, 1.206, -3.081], size: [0.8, 0.4, 0.4] },
        { center: [-0.004, 1.806, -0.681], size: [2.4, 1.6, 0.4] },
        { center: [-0.004, 2.406, -0.281], size: [2.4, 2.0, 0.4] },
        { center: [-0.804, 2.006, -2.481], size: [0.8, 0.4, 0.8] },
        { center: [-0.004, 2.206, -1.081], size: [2.4, 0.8, 0.4] },
        { center: [-0.004, 2.406, -1.481], size: [2.4, 0.4, 0.4] },
        { center: [-0.804, 3.206, -0.881], size: [0.8, 0.4, 0.8] },
        { center: [-0.204, 3.606, -0.281], size: [2.0, 0.4, 0.4] },
        { center: [0.396, 1.006, -1.481], size: [2.4, 1.6, 0.4] },
        { center: [0.196, 0.606, -0.681], size: [2.0, 0.8, 0.4] },
        { center: [0.396, 0.806, -2.281], size: [2.4, 0.4, 1.2] },
        { center: [-0.004, 1.006, -0.281], size: [1.6, 0.8, 0.4] },
        { center: [-0.004, 0.806, 0.119], size: [1.6, 0.4, 0.4] },
        { center: [-0.604, 1.406, -2.281], size: [0.4, 0.8, 1.2] },
        { center: [-0.604, 2.006, -3.081], size: [0.4, 1.2, 0.4] },
        { center: [-0.204, 2.206, 0.119], size: [1.2, 1.6, 0.4] },
        { center: [-0.004, 2.006, -3.681], size: [1.6, 0.4, 0.8] },
        { center: [-0.004, 2.406, -3.481], size: [1.6, 0.4, 0.4] },
        { center: [-0.004, 2.406, -2.281], size: [1.6, 0.4, 1.2] },
        { center: [-0.204, 2.806, -1.281], size: [1.2, 0.4, 1.6] },
        { center: [-0.604, 3.406, -1.681], size: [0.4, 0.8, 0.8] },
        { center: [-0.004, 3.606, -0.881], size: [1.6, 0.4, 0.8] },
        { center: [-0.604, 3.606, 0.119], size: [0.4, 0.4, 0.4] },
        { center: [-0.004, 0.406, -2.081], size: [0.8, 0.4, 0.8] },
        { center: [-0.004, 0.406, -0.081], size: [0.8, 0.4, 0.8] },
        { center: [-0.004, 1.206, 0.119], size: [0.8, 0.4, 0.4] },
        { center: [0.596, 2.006, -1.481], size: [2.0, 0.4, 0.4] },
        { center: [0.196, 2.406, -3.081], size: [1.2, 0.4, 0.4] },
        { center: [-0.004, 2.806, -2.681], size: [0.8, 0.4, 1.2] },
        { center: [-0.004, 3.206, -2.481], size: [0.8, 0.4, 0.8] },
        { center: [0.196, 3.406, -1.481], size: [1.2, 0.8, 0.4] },
        { center: [0.196, 3.606, -1.881], size: [1.2, 0.4, 0.4] },
        { center: [0.796, 1.206, -2.481], size: [0.8, 0.4, 1.6] },
        { center: [0.596, 1.806, -2.481], size: [0.4, 0.8, 1.6] },
        { center: [0.596, 2.806, 0.119], size: [0.4, 2.0, 0.4] },
        { center: [0.596, 2.806, -1.081], size: [0.4, 0.4, 1.2] },
        { center: [0.596, 3.206, -0.881], size: [0.4, 0.4, 0.8] },
        { center: [1.196, 0.206, -2.081], size: [0.8, 0.8, 0.8] },
        { center: [1.196, 0.006, -1.481], size: [0.8, 0.4, 0.4] },
        { center: [1.196, 0.406, -2.681], size: [0.8, 0.4, 0.4] },
        { center: [1.196, 1.606, -2.081], size: [0.8, 0.4, 0.8] },
        { center: [1.196, 2.006, -1.881], size: [0.8, 0.4, 0.4] },
        { center: [0.996, 3.206, -0.681], size: [0.4, 0.4, 0.4] },
        { center: [1.396, 1.206, -2.281], size: [0.4, 0.4, 1.2] },
      ],
      chassis_front: [
        { center: [-1.207, 0.8, 1.053], size: [0.8, 2.0, 1.6] },
        { center: [-0.007, 0.6, 2.053], size: [3.2, 0.8, 0.4] },
        { center: [-0.007, 0.8, 0.053], size: [3.2, 0.4, 0.4] },
        { center: [-1.207, 1.2, 0.053], size: [0.8, 0.4, 0.4] },
        { center: [-1.207, 1.2, 2.053], size: [0.8, 0.4, 0.4] },
        { center: [-0.807, 2.0, 0.453], size: [0.8, 0.4, 0.4] },
        { center: [-1.007, 2.4, 0.653], size: [0.4, 0.4, 0.8] },
        { center: [-0.607, 0.0, 2.253], size: [0.4, 0.4, 0.8] },
        { center: [-0.007, 0.6, 2.453], size: [1.6, 0.8, 0.4] },
        { center: [0.393, 1.0, 0.853], size: [2.4, 0.8, 1.2] },
        { center: [0.393, 0.8, 1.653], size: [2.4, 0.4, 0.4] },
        { center: [-0.007, 2.0, 0.053], size: [1.6, 1.2, 0.4] },
        { center: [0.193, 0.0, 2.453], size: [1.2, 0.4, 0.4] },
        { center: [-0.007, 0.4, 0.853], size: [0.8, 0.4, 2.0] },
        { center: [-0.207, 1.2, -0.147], size: [0.4, 0.4, 0.8] },
        { center: [0.193, 0.4, -0.347], size: [0.4, 0.4, 0.4] },
        { center: [0.793, 1.2, 0.053], size: [1.6, 0.4, 0.4] },
        { center: [0.193, 2.4, 0.453], size: [0.4, 0.4, 0.4] },
        { center: [0.393, 2.8, 0.053], size: [0.8, 0.4, 0.4] },
        { center: [0.593, 0.0, 2.053], size: [0.4, 0.4, 0.4] },
        { center: [0.593, 1.2, -0.347], size: [0.4, 0.4, 0.4] },
        { center: [0.993, 1.2, 1.853], size: [1.2, 0.4, 0.8] },
        { center: [1.193, 0.2, 1.053], size: [0.8, 0.8, 1.6] },
        { center: [1.193, 1.6, 1.053], size: [0.8, 0.4, 1.6] },
        { center: [0.993, 2.2, 0.453], size: [0.4, 0.8, 0.4] },
        { center: [0.993, 2.4, 0.853], size: [0.4, 0.4, 0.4] },
      ],
      loader_arms: [
        { center: [-0.028, -1.995, 2.91], size: [3.2, 0.4, 1.2] },
        { center: [-0.028, -1.395, 2.11], size: [3.2, 0.8, 0.4] },
        { center: [-0.828, -1.195, 2.51], size: [1.6, 1.2, 0.4] },
        { center: [-1.428, -1.195, 2.91], size: [0.4, 1.2, 0.4] },
        { center: [-1.428, -1.595, 3.31], size: [0.4, 0.4, 0.4] },
        { center: [0.172, -1.995, 2.11], size: [2.8, 0.4, 0.4] },
        { center: [0.172, -0.795, 2.91], size: [2.8, 0.4, 0.4] },
        { center: [-0.028, -0.195, 0.11], size: [2.4, 0.8, 0.4] },
        { center: [-0.028, -0.395, 0.51], size: [2.4, 0.4, 0.4] },
        { center: [-0.628, -0.595, 0.91], size: [0.4, 1.6, 0.4] },
        { center: [0.172, -0.995, 1.31], size: [2.0, 0.8, 0.4] },
        { center: [-0.028, -0.795, 1.71], size: [1.6, 1.2, 0.4] },
        { center: [-0.028, -0.395, -0.29], size: [1.6, 1.2, 0.4] },
        { center: [0.172, -0.795, 0.31], size: [2.0, 0.4, 0.8] },
        { center: [-0.028, -0.395, 1.31], size: [1.6, 0.4, 0.4] },
        { center: [-0.028, 0.005, 0.51], size: [1.6, 0.4, 0.4] },
        { center: [-0.628, 0.405, -0.09], size: [0.4, 0.4, 0.8] },
        { center: [0.372, -0.595, 0.91], size: [1.6, 0.8, 0.4] },
        { center: [-0.228, -0.395, -0.69], size: [0.4, 0.4, 0.4] },
        { center: [0.172, 0.005, 0.91], size: [1.2, 0.4, 0.4] },
        { center: [-0.028, 0.005, 1.51], size: [0.8, 0.4, 0.8] },
        { center: [0.172, 0.405, 0.11], size: [1.2, 0.4, 0.4] },
        { center: [-0.028, 0.405, 0.51], size: [0.8, 0.4, 0.4] },
        { center: [0.772, -0.995, 2.51], size: [1.6, 0.8, 0.4] },
        { center: [0.372, 0.405, -0.29], size: [0.8, 0.4, 0.4] },
        { center: [0.572, -1.595, 2.51], size: [0.4, 0.4, 0.4] },
        { center: [1.372, -1.595, 2.91], size: [0.4, 0.4, 1.2] },
        { center: [1.372, -1.195, 2.91], size: [0.4, 0.4, 0.4] },
      ],
    },
    singleCameraId: 'front',
  },
};

export const MACHINE_KEYS = Object.keys(MACHINES) as MachineKey[];

/**
 * Sector names used when a gap is reported. Bearings are in the operator's frame:
 * for the excavator that is the slewed house, for the wheel loader the rear frame
 * the cab sits on — in both cases, the direction the operator is facing.
 */
export const SECTORS: { name: string; from: number; to: number }[] = [
  { name: 'front', from: -22.5, to: 22.5 },
  { name: 'front right', from: 22.5, to: 67.5 },
  { name: 'right', from: 67.5, to: 112.5 },
  { name: 'rear right', from: 112.5, to: 157.5 },
  { name: 'rear', from: 157.5, to: 202.5 },
  { name: 'rear left', from: 202.5, to: 247.5 },
  { name: 'left', from: 247.5, to: 292.5 },
  { name: 'front left', from: 292.5, to: 337.5 },
];

/** Copy shown when WebGL is unavailable, and under the poster before load. */
export const FALLBACK_COPY = {
  eyebrow: 'On-machine vision',
  title: 'Coverage that travels with the machine',
  body:
    'Three 110° cameras mounted on the machine itself cover 330° of the 360° around ' +
    'it. The remaining three seams are real, and because the cameras sit metres apart ' +
    'rather than at one point they are wider than the arithmetic suggests. They are ' +
    'drawn as they fall. Interactive 3D needs WebGL, which this browser has turned ' +
    'off or does not support.',
};
