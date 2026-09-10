/**
 * Shared types for the camera-coverage module.
 *
 * Coordinate convention used everywhere in this module:
 *   +X = machine right, +Y = up, +Z = machine forward, ground plane at y = 0.
 *   Yaw 0 = machine forward (+Z), positive yaw = clockwise seen from above.
 *   Pitch 0 = level, negative pitch = looking down.
 * Distances are metres, angles are degrees unless a name says `Rad`.
 */

export type Vec3 = [number, number, number];

/** A single camera as declared in config, before the user edits anything. */
export interface CameraConfig {
  id: string;
  label: string;
  /** Name of the rig node this camera is bolted to. It inherits that node's world transform. */
  mount: string;
  /** Position in the mount node's LOCAL space (metres). */
  position: Vec3;
  /** Heading relative to the mount node. */
  yaw: number;
  /** Downward tilt; negative looks at the ground. */
  pitch: number;
}

/** Camera state after user edits. Same shape plus the per-camera FOV override. */
export interface CameraState extends CameraConfig {
  hFov: number;
  vFov: number;
  enabled: boolean;
}

/** An axis-aligned box in a rig node's LOCAL space, used as an occluder. */
export interface ColliderBox {
  center: Vec3;
  size: Vec3;
}

export type RigType = 'slew' | 'articulated';

export interface SlewRigNodes {
  base: string;
  rotating: string;
  arm: string;
}

export interface ArticulatedRigNodes {
  rear: string;
  front: string;
  arm: string;
}

export interface SlewRig {
  type: 'slew';
  nodes: SlewRigNodes;
}

export interface ArticulatedRig {
  type: 'articulated';
  nodes: ArticulatedRigNodes;
}

export type Rig = SlewRig | ArticulatedRig;

/** Range of motion for one articulation axis, in degrees. */
export interface AxisLimits {
  min: number;
  max: number;
  /** Where the machine sits before the user touches anything. */
  rest: number;
}

export interface MachineConfig {
  label: string;
  glb: string;
  rig: Rig;
  /** Radius of the zone the coverage percentage is measured over. */
  workingRadius: number;
  /**
   * Radius of the machine's own footprint. Ground inside it is under the machine,
   * so it is excluded from both the percentage and the blind-zone search — nobody
   * stands there, and counting it as "uncovered" would understate the result and
   * merge every seam into one blob through the middle.
   */
  footprintRadius: number;
  cameras: CameraConfig[];
  /**
   * Pivot of each articulating node, in its PARENT node's local space.
   * These mirror the node translations baked into the GLB — see README.
   */
  pivots: Record<string, Vec3>;
  limits: {
    /** Slew (excavator) or steering (wheel loader), about +Y. */
    swing: AxisLimits;
    /** Boom or loader arms, about +X. Negative raises. */
    arm: AxisLimits;
  };
  colliders: Record<string, ColliderBox[]>;
  /** Which camera stands in for "a typical single fixed camera" in the comparison toggle. */
  singleCameraId: string;
}

/** Live articulation state for whichever machine is on screen. */
export interface RigState {
  /** Excavator: house slew. Wheel loader: steering angle at the centre joint. */
  swing: number;
  /** Excavator: boom. Wheel loader: loader arms. */
  arm: number;
}

/** Result of one coverage solve over the ground grid. */
export interface CoverageResult {
  /** grid.cells × grid.cells, row-major, indexed [iz * cells + ix]. 0 = uncovered. */
  mask: Uint8Array;
  /** Number of cameras that see each cell — drives the overlap read. */
  depth: Uint8Array;
  /** Fraction of the working-radius disc that is covered, 0..1. */
  coveredFraction: number;
  /** Ground area inside the working radius, m². */
  workingArea: number;
  blindZones: BlindZone[];
}

export interface BlindZone {
  id: number;
  /** Human name for the sector the gap falls in, e.g. "rear left". */
  sector: string;
  /** Distance from the machine centre to the gap's centroid, metres. */
  distance: number;
  /** Bearing of the centroid in the operator's frame, degrees clockwise from forward. */
  bearing: number;
  /** Ground area of the gap, m². */
  area: number;
  /** Centroid in world XZ. */
  centroid: [number, number];
}

export type MachineKey = 'excavator' | 'wheelLoader';

/** A worker's position on the ground plane, world XZ. */
export type WorkerPos = [number, number];
