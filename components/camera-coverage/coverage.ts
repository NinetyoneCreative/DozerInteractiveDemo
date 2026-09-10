/**
 * Coverage solver.
 *
 * Deliberately free of three.js so it can run anywhere and stay cheap: plain
 * arrays, rigid transforms, one allocation-free pass over the grid.
 *
 * The rule for a covered cell, exactly as specified:
 *   a cell is covered if it falls inside any camera frustum AND a raycast from
 *   that camera to the cell is not blocked by machine geometry.
 * Occlusion uses the simplified box colliders from config, never the GLB mesh.
 */

import { FOV, GRID, MACHINES, OCCLUSION, RANGE, SAMPLE_HEIGHT, SECTORS } from './config';
import type {
  BlindZone,
  CameraState,
  ColliderBox,
  CoverageResult,
  MachineConfig,
  MachineKey,
  RigState,
  Vec3,
} from './types';

const DEG = Math.PI / 180;

/* ------------------------------------------------------------- transforms -*/

/** A rigid transform: 3×3 row-major rotation plus a translation. */
export interface Transform {
  r: number[]; // row-major: r[row * 3 + col]
  t: Vec3;
}

const IDENTITY: Transform = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };

function rotY(a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function rotX(a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function mulR(a: number[], b: number[]): number[] {
  const o = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return o;
}

function applyR(r: number[], v: Vec3): Vec3 {
  return [
    r[0] * v[0] + r[1] * v[1] + r[2] * v[2],
    r[3] * v[0] + r[4] * v[1] + r[5] * v[2],
    r[6] * v[0] + r[7] * v[1] + r[8] * v[2],
  ];
}

/** Applies the transpose — for a rotation matrix that is the inverse rotation. */
function applyRT(r: number[], v: Vec3): Vec3 {
  return [
    r[0] * v[0] + r[3] * v[1] + r[6] * v[2],
    r[1] * v[0] + r[4] * v[1] + r[7] * v[2],
    r[2] * v[0] + r[5] * v[1] + r[8] * v[2],
  ];
}

export function applyTransform(m: Transform, v: Vec3): Vec3 {
  const p = applyR(m.r, v);
  return [p[0] + m.t[0], p[1] + m.t[1], p[2] + m.t[2]];
}

function compose(a: Transform, b: Transform): Transform {
  const tb = applyR(a.r, b.t);
  return { r: mulR(a.r, b.r), t: [tb[0] + a.t[0], tb[1] + a.t[1], tb[2] + a.t[2]] };
}

function translation(t: Vec3): Transform {
  return { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t };
}

/**
 * World transform of every rig node for the current articulation state.
 *
 * The hierarchy is exactly the one baked into the GLB:
 *   slew:        base → rotating (yaw about the slew axis) → arm (pitch about the boom pin)
 *   articulated: rear → front    (yaw about the centre joint) → arm (pitch about the lift pin)
 */
export function nodeTransforms(machine: MachineConfig, rig: RigState): Record<string, Transform> {
  const swing = rig.swing * DEG;
  const arm = rig.arm * DEG;
  const out: Record<string, Transform> = {};

  if (machine.rig.type === 'slew') {
    const { base, rotating, arm: armNode } = machine.rig.nodes;
    out[base] = IDENTITY;
    out[rotating] = { r: rotY(swing), t: [0, 0, 0] };
    out[armNode] = compose(
      compose(out[rotating], translation(machine.pivots[armNode])),
      { r: rotX(arm), t: [0, 0, 0] },
    );
  } else {
    const { rear, front, arm: armNode } = machine.rig.nodes;
    out[rear] = IDENTITY;
    out[front] = { r: rotY(swing), t: [0, 0, 0] };
    out[armNode] = compose(
      compose(out[front], translation(machine.pivots[armNode])),
      { r: rotX(arm), t: [0, 0, 0] },
    );
  }
  return out;
}

/** The node whose heading the operator shares — the house, or the cab-carrying rear frame. */
export function operatorNode(machine: MachineConfig): string {
  return machine.rig.type === 'slew' ? machine.rig.nodes.rotating : machine.rig.nodes.rear;
}

/* ----------------------------------------------------------- camera solve -*/

export interface SolvedCamera {
  id: string;
  pos: Vec3;
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
  tanH: number;
  tanV: number;
  /** Squared coverage range — RANGE.effective, not RANGE.max. */
  rangeSq: number;
  /**
   * Per-occluder-node mask of boxes this camera ignores (its own mounting
   * structure). A flat Uint8Array per node rather than a Set of string keys —
   * this is read once per box per ray, and building `"node:3"` in that loop was
   * allocating a string tens of millions of times per solve.
   */
  skip: Uint8Array[];
}

/** Local-space direction basis for a camera at the given yaw / pitch. */
function localBasis(yawDeg: number, pitchDeg: number) {
  const y = yawDeg * DEG;
  const p = pitchDeg * DEG;
  const fwd: Vec3 = [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)];
  const right: Vec3 = [Math.cos(y), 0, -Math.sin(y)];
  // up = fwd × right, which gives +Y for a level camera facing +Z.
  const up: Vec3 = [
    fwd[1] * right[2] - fwd[2] * right[1],
    fwd[2] * right[0] - fwd[0] * right[2],
    fwd[0] * right[1] - fwd[1] * right[0],
  ];
  return { fwd, right, up };
}

/** World position and orientation of a camera, given its mount node's transform. */
export function solveCameraPose(cam: CameraState, transforms: Record<string, Transform>) {
  const m = transforms[cam.mount] ?? IDENTITY;
  const { fwd, right, up } = localBasis(cam.yaw, cam.pitch);
  return {
    pos: applyTransform(m, cam.position),
    fwd: applyR(m.r, fwd),
    right: applyR(m.r, right),
    up: applyR(m.r, up),
  };
}

interface OccluderNode {
  name: string;
  r: number[];
  t: Vec3;
  min: Float64Array;
  max: Float64Array;
  count: number;
  /** AABB of the whole node in its own local space, tested first to skip the rest. */
  hullMin: Vec3;
  hullMax: Vec3;
}

function buildOccluders(machine: MachineConfig, transforms: Record<string, Transform>): OccluderNode[] {
  const out: OccluderNode[] = [];
  for (const [name, boxes] of Object.entries(machine.colliders)) {
    const m = transforms[name] ?? IDENTITY;
    const min = new Float64Array(boxes.length * 3);
    const max = new Float64Array(boxes.length * 3);
    const hullMin: Vec3 = [Infinity, Infinity, Infinity];
    const hullMax: Vec3 = [-Infinity, -Infinity, -Infinity];
    boxes.forEach((b: ColliderBox, i: number) => {
      for (let k = 0; k < 3; k++) {
        const lo = b.center[k] - b.size[k] / 2;
        const hi = b.center[k] + b.size[k] / 2;
        min[i * 3 + k] = lo;
        max[i * 3 + k] = hi;
        if (lo < hullMin[k]) hullMin[k] = lo;
        if (hi > hullMax[k]) hullMax[k] = hi;
      }
    });
    out.push({ name, r: m.r, t: m.t, min, max, count: boxes.length, hullMin, hullMax });
  }
  return out;
}

export function solveCameras(
  machine: MachineConfig,
  cameras: CameraState[],
  transforms: Record<string, Transform>,
  occluders: OccluderNode[],
): SolvedCamera[] {
  return cameras.map((cam) => {
    const pose = solveCameraPose(cam, transforms);
    // Boxes right at the lens are the camera's own mounting structure — see
    // OCCLUSION.mountClearance. They are excluded for this camera only; every
    // other box on the machine still blocks it.
    const c = OCCLUSION.mountClearance;
    const skip = occluders.map((node) => {
      const mask = new Uint8Array(node.count);
      const lp = applyRT(node.r, [pose.pos[0] - node.t[0], pose.pos[1] - node.t[1], pose.pos[2] - node.t[2]]);
      for (let i = 0; i < node.count; i++) {
        const o = i * 3;
        if (
          lp[0] >= node.min[o] - c && lp[0] <= node.max[o] + c &&
          lp[1] >= node.min[o + 1] - c && lp[1] <= node.max[o + 1] + c &&
          lp[2] >= node.min[o + 2] - c && lp[2] <= node.max[o + 2] + c
        ) {
          mask[i] = 1;
        }
      }
      return mask;
    });
    return {
      id: cam.id,
      pos: pose.pos,
      fwd: pose.fwd,
      right: pose.right,
      up: pose.up,
      tanH: Math.tan((cam.hFov / 2) * DEG),
      tanV: Math.tan((cam.vFov / 2) * DEG),
      rangeSq: RANGE.effective * RANGE.effective,
      skip,
    };
  });
}

/* ------------------------------------------------------------- visibility -*/

/** Slab test of a segment against one node's local boxes. */
function segmentHitsNode(
  node: OccluderNode,
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  tMax: number,
  skip: Uint8Array,
): boolean {
  // Move the segment into the node's local frame — the boxes are axis-aligned there.
  const rx = ox - node.t[0], ry = oy - node.t[1], rz = oz - node.t[2];
  const r = node.r;
  const lox = r[0] * rx + r[3] * ry + r[6] * rz;
  const loy = r[1] * rx + r[4] * ry + r[7] * rz;
  const loz = r[2] * rx + r[5] * ry + r[8] * rz;
  const ldx = r[0] * dx + r[3] * dy + r[6] * dz;
  const ldy = r[1] * dx + r[4] * dy + r[7] * dz;
  const ldz = r[2] * dx + r[5] * dy + r[8] * dz;

  const ix = ldx !== 0 ? 1 / ldx : Infinity;
  const iy = ldy !== 0 ? 1 / ldy : Infinity;
  const iz = ldz !== 0 ? 1 / ldz : Infinity;

  // Whole-node rejection first — most rays miss most nodes entirely, and this
  // turns ~100 slab tests per ray into one.
  {
    let h0 = (node.hullMin[0] - lox) * ix;
    let h1 = (node.hullMax[0] - lox) * ix;
    if (h0 > h1) { const s = h0; h0 = h1; h1 = s; }
    let g0 = (node.hullMin[1] - loy) * iy;
    let g1 = (node.hullMax[1] - loy) * iy;
    if (g0 > g1) { const s = g0; g0 = g1; g1 = s; }
    if (g0 > h0) h0 = g0;
    if (g1 < h1) h1 = g1;
    let k0 = (node.hullMin[2] - loz) * iz;
    let k1 = (node.hullMax[2] - loz) * iz;
    if (k0 > k1) { const s = k0; k0 = k1; k1 = s; }
    if (k0 > h0) h0 = k0;
    if (k1 < h1) h1 = k1;
    if (h1 < h0 || h0 > tMax || h1 < 1e-4) return false;
  }

  for (let i = 0; i < node.count; i++) {
    if (skip[i]) continue;
    const o = i * 3;
    let t0 = (node.min[o] - lox) * ix;
    let t1 = (node.max[o] - lox) * ix;
    if (t0 > t1) { const s = t0; t0 = t1; t1 = s; }
    let u0 = (node.min[o + 1] - loy) * iy;
    let u1 = (node.max[o + 1] - loy) * iy;
    if (u0 > u1) { const s = u0; u0 = u1; u1 = s; }
    if (u0 > t0) t0 = u0;
    if (u1 < t1) t1 = u1;
    if (t1 < t0) continue;
    let v0 = (node.min[o + 2] - loz) * iz;
    let v1 = (node.max[o + 2] - loz) * iz;
    if (v0 > v1) { const s = v0; v0 = v1; v1 = s; }
    if (v0 > t0) t0 = v0;
    if (v1 < t1) t1 = v1;
    if (t1 < t0) continue;
    // Only a crossing strictly between the lens and the target blocks the view.
    if (t0 > 1e-4 && t0 < tMax) return true;
  }
  return false;
}

/**
 * Is the ground point (px, py, pz) seen by this camera?
 * Returns true only if it is inside the frustum AND the line of sight is clear.
 */
export function pointVisible(
  cam: SolvedCamera,
  occluders: OccluderNode[],
  px: number, py: number, pz: number,
): boolean {
  const vx = px - cam.pos[0];
  const vy = py - cam.pos[1];
  const vz = pz - cam.pos[2];

  const distSq = vx * vx + vy * vy + vz * vz;
  if (distSq > cam.rangeSq || distSq < 1e-6) return false;

  const z = vx * cam.fwd[0] + vy * cam.fwd[1] + vz * cam.fwd[2];
  if (z <= 0) return false;
  const x = vx * cam.right[0] + vy * cam.right[1] + vz * cam.right[2];
  if (Math.abs(x) > z * cam.tanH) return false;
  const y = vx * cam.up[0] + vy * cam.up[1] + vz * cam.up[2];
  if (Math.abs(y) > z * cam.tanV) return false;

  const dist = Math.sqrt(distSq);
  const dx = vx / dist, dy = vy / dist, dz = vz / dist;
  const tMax = dist - 1e-3;
  for (let i = 0; i < occluders.length; i++) {
    if (segmentHitsNode(occluders[i], cam.pos[0], cam.pos[1], cam.pos[2], dx, dy, dz, tMax, cam.skip[i])) {
      return false;
    }
  }
  return true;
}

/* ------------------------------------------------------------- grid solve -*/

export interface CoverageContext {
  cams: SolvedCamera[];
  occluders: OccluderNode[];
  transforms: Record<string, Transform>;
  machine: MachineConfig;
}

/** Everything the solver and the hit-tests need for the current machine pose. */
export function buildContext(
  machineKey: MachineKey,
  cameras: CameraState[],
  rig: RigState,
): CoverageContext {
  const machine = MACHINES[machineKey];
  const transforms = nodeTransforms(machine, rig);
  const occluders = buildOccluders(machine, transforms);
  const enabled = cameras.filter((c) => c.enabled);
  return { cams: solveCameras(machine, enabled, transforms, occluders), occluders, transforms, machine };
}

/** Number of cameras that can see a single ground point. Used by the figure. */
export function coverageAt(ctx: CoverageContext, x: number, z: number): number {
  let n = 0;
  for (const cam of ctx.cams) {
    if (pointVisible(cam, ctx.occluders, x, SAMPLE_HEIGHT, z)) n++;
  }
  return n;
}

export const gridCells = () => Math.round(GRID.extent / GRID.cell);

/** World XZ of a grid cell centre. */
export function cellToWorld(i: number, cells: number): number {
  return (i + 0.5) * GRID.cell - GRID.extent / 2;
}

export function solveCoverage(ctx: CoverageContext): CoverageResult {
  const cells = gridCells();
  const mask = new Uint8Array(cells * cells);
  const depth = new Uint8Array(cells * cells);
  const radius = ctx.machine.workingRadius;
  const radiusSq = radius * radius;
  const innerSq = ctx.machine.footprintRadius * ctx.machine.footprintRadius;

  let inRadius = 0;
  let coveredInRadius = 0;

  for (let iz = 0; iz < cells; iz++) {
    const z = cellToWorld(iz, cells);
    for (let ix = 0; ix < cells; ix++) {
      const x = cellToWorld(ix, cells);
      const idx = iz * cells + ix;
      let n = 0;
      for (let c = 0; c < ctx.cams.length; c++) {
        if (pointVisible(ctx.cams[c], ctx.occluders, x, SAMPLE_HEIGHT, z)) n++;
      }
      depth[idx] = n;
      mask[idx] = n > 0 ? 1 : 0;
      const rSq = x * x + z * z;
      if (rSq <= radiusSq && rSq >= innerSq) {
        inRadius++;
        if (n > 0) coveredInRadius++;
      }
    }
  }

  const cellArea = GRID.cell * GRID.cell;
  return {
    mask,
    depth,
    coveredFraction: inRadius > 0 ? coveredInRadius / inRadius : 0,
    workingArea: inRadius * cellArea,
    blindZones: findBlindZones(mask, cells, ctx),
  };
}

/* ------------------------------------------------------------ blind zones -*/

/** Bearing in degrees clockwise from the operator's forward direction, 0..360. */
function bearingFor(ctx: CoverageContext, x: number, z: number): number {
  const node = operatorNode(ctx.machine);
  const m = ctx.transforms[node];
  // Operator forward is the node's local +Z pushed into world space.
  const fx = m.r[2];
  const fz = m.r[8];
  const rx = m.r[0];
  const rz = m.r[6];
  const along = x * fx + z * fz;
  const across = x * rx + z * rz;
  let deg = Math.atan2(across, along) / DEG;
  if (deg < 0) deg += 360;
  return deg;
}

function sectorName(bearing: number): string {
  for (const s of SECTORS) {
    const from = (s.from + 360) % 360;
    const to = (s.to + 360) % 360;
    if (from > to) {
      if (bearing >= from || bearing < to) return s.name;
    } else if (bearing >= from && bearing < to) {
      return s.name;
    }
  }
  return 'front';
}

/**
 * Flood-fills the uncovered cells inside the working radius and names each gap.
 * Gaps smaller than GRID.minBlindZoneArea are grid noise, not places a person stands.
 */
function findBlindZones(mask: Uint8Array, cells: number, ctx: CoverageContext): BlindZone[] {
  const radiusSq = ctx.machine.workingRadius * ctx.machine.workingRadius;
  const innerSq = ctx.machine.footprintRadius * ctx.machine.footprintRadius;
  const seen = new Uint8Array(cells * cells);
  const zones: BlindZone[] = [];
  const cellArea = GRID.cell * GRID.cell;
  const stack: number[] = [];
  let id = 0;

  // The annulus between the machine's own footprint and the working radius. The
  // inner cut-off is what keeps three separate seams from flood-filling into one
  // ring through the permanently-dark ground under the machine.
  const inZone = (ix: number, iz: number) => {
    const x = cellToWorld(ix, cells);
    const z = cellToWorld(iz, cells);
    const r = x * x + z * z;
    return r <= radiusSq && r >= innerSq;
  };

  for (let iz = 0; iz < cells; iz++) {
    for (let ix = 0; ix < cells; ix++) {
      const start = iz * cells + ix;
      if (seen[start] || mask[start] || !inZone(ix, iz)) continue;
      seen[start] = 1;
      stack.length = 0;
      stack.push(start);
      let sumX = 0;
      let sumZ = 0;
      let count = 0;
      let minDistSq = Infinity;
      while (stack.length) {
        const cur = stack.pop() as number;
        const cx = cur % cells;
        const cz = (cur - cx) / cells;
        const wx = cellToWorld(cx, cells);
        const wz = cellToWorld(cz, cells);
        sumX += wx;
        sumZ += wz;
        count++;
        const d = wx * wx + wz * wz;
        if (d < minDistSq) minDistSq = d;
        const neighbours = [
          cx > 0 ? cur - 1 : -1,
          cx < cells - 1 ? cur + 1 : -1,
          cz > 0 ? cur - cells : -1,
          cz < cells - 1 ? cur + cells : -1,
        ];
        for (const n of neighbours) {
          if (n < 0 || seen[n] || mask[n]) continue;
          const nx = n % cells;
          const nz = (n - nx) / cells;
          if (!inZone(nx, nz)) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
      const area = count * cellArea;
      if (area < GRID.minBlindZoneArea) continue;
      const cxw = sumX / count;
      const czw = sumZ / count;
      const bearing = bearingFor(ctx, cxw, czw);
      zones.push({
        id: id++,
        sector: sectorName(bearing),
        // Nearest approach reads more honestly than centroid distance: it is
        // where a person first disappears.
        distance: Math.sqrt(minDistSq),
        bearing,
        area,
        centroid: [cxw, czw],
      });
    }
  }

  zones.sort((a, b) => b.area - a.area);
  return zones.slice(0, GRID.maxNamedZones);
}

/* ------------------------------------------------------------------ setup -*/

/** Fresh camera state straight from config — also what Reset returns to. */
export function defaultCameraState(machineKey: MachineKey): CameraState[] {
  return MACHINES[machineKey].cameras.map((c) => ({
    ...c,
    position: [...c.position] as Vec3,
    hFov: FOV.horizontal,
    vFov: FOV.vertical,
    enabled: true,
  }));
}

export function defaultRigState(machineKey: MachineKey): RigState {
  const l = MACHINES[machineKey].limits;
  return { swing: l.swing.rest, arm: l.arm.rest };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
