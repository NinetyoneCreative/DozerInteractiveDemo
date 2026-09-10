'use client';

/**
 * The controls and the readout, as separate pieces.
 *
 * They are exported individually because the module places them in two very
 * different ways: floated over the edges of the scene on desktop, and stacked
 * underneath it on a phone, where there is no spare canvas to float anything on.
 * `CameraCoverage` picks the arrangement; nothing here knows which one it is in.
 *
 * Plain DOM, not 3D UI, so everything is focusable and readable by a screen
 * reader. Each `id` appears once in the document, so the layouts are chosen at
 * runtime rather than both being rendered and one hidden.
 */

import {
  CAMERA_EDIT_LIMITS,
  COLORS,
  ENVIRONMENTS,
  ENVIRONMENT_KEYS,
  FOV,
  MACHINES,
  MACHINE_KEYS,
  RANGE,
  WORKERS,
} from './config';
import type { EnvironmentKey } from './config';
import { useCoverageStore } from './store';
import type { MachineKey } from './types';

/* ------------------------------------------------------------- primitives -*/

/** Segmented control. `cols` lets the environment switch go 2×2. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  cols = 2,
  size = 'md',
}: {
  label: string;
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  cols?: number;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-card bg-dozer-page/80 p-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-[6px] px-2 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dozer-yellow ${
            size === 'sm' ? 'py-1.5 text-[11.5px]' : 'py-2 text-[12.5px]'
          } ${
            value === o.key
              ? 'bg-dozer-card text-dozer-heading shadow-sm'
              : 'text-dozer-body hover:text-dozer-heading'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  const id = `sl-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[12.5px] text-dozer-body">
          {label}
          {hint ? <span className="ml-1.5 text-[10.5px] text-dozer-muted">({hint})</span> : null}
        </label>
        <span className="font-mono text-[12px] text-dozer-heading tabular-nums">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-5 w-full cursor-pointer accent-[#fdac13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dozer-yellow"
      />
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `ck-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#fdac13]"
      />
      <label htmlFor={id} className="cursor-pointer text-[12.5px] text-dozer-body">
        {label}
      </label>
    </div>
  );
}

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dozer-muted">
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ stats -*/

/** Coverage percentage, named blind zones and the worker roll. */
export function StatsReadout() {
  const machineKey = useCoverageStore((s) => s.machineKey);
  const coverage = useCoverageStore((s) => s.coverage);
  const machine = MACHINES[machineKey];

  // The three shares are rounded once, here, and everything below — the bar, the
  // rows and the headline — is built from those same numbers. Deriving the
  // headline separately would let it disagree with its own breakdown by a point.
  const operatorPct = coverage ? Math.round(coverage.operatorFraction * 100) : 0;
  const cameraPct = coverage ? Math.round(coverage.cameraOnlyFraction * 100) : 0;
  const blindPct = Math.max(0, 100 - operatorPct - cameraPct);
  const pct = coverage ? operatorPct + cameraPct : null;

  const rows: { key: string; color: string; value: number; label: string }[] = [
    { key: 'op', color: COLORS.operator, value: operatorPct, label: 'Operator sees from the cab' },
    { key: 'cam', color: COLORS.coverage, value: cameraPct, label: 'Only the cameras reach' },
    { key: 'blind', color: COLORS.warning, value: blindPct, label: 'Neither can see' },
  ];

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dozer-muted">
        Ground covered
      </p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="font-mono text-[38px] leading-none text-dozer-heading tabular-nums">
          {pct === null ? '—' : `${pct}%`}
        </span>
        <span className="text-[12px] leading-tight text-dozer-body">
          of the {machine.workingRadius} m
          <br />
          working radius
        </span>
      </div>

      <div
        className="mt-2.5 flex h-1.5 w-full overflow-hidden rounded-full bg-dozer-page"
        role="img"
        aria-label={
          `Of the ${machine.workingRadius} metre working radius, the operator sees ` +
          `${operatorPct} percent directly, the cameras add ${cameraPct} percent, ` +
          `and ${blindPct} percent is seen by neither`
        }
      >
        {rows.map((r) => (
          <div
            key={r.key}
            className="h-full transition-[width] duration-200"
            style={{ width: `${r.value}%`, backgroundColor: r.color }}
          />
        ))}
      </div>

      <ul className="mt-1.5 flex flex-col gap-0.5" aria-hidden="true">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline gap-1.5 text-[11.5px] leading-snug">
            <span
              className="mt-[3px] inline-block h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: r.color }}
            />
            <span className="font-mono tabular-nums text-dozer-heading">{r.value}%</span>
            <span className="text-dozer-body">{r.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-1 text-[10.5px] leading-snug text-dozer-muted">
        Between the machine&rsquo;s {machine.footprintRadius} m footprint and the{' '}
        {machine.workingRadius} m working radius. Direct sight is a modelled
        seated arc, not a measured ISO 5006 study.
      </p>

      <BlindZoneList />
      <WorkerRoll />
    </div>
  );
}

/** Named blind zones, always paired with words — never colour alone. */
function BlindZoneList() {
  const coverage = useCoverageStore((s) => s.coverage);
  const zones = coverage?.blindZones ?? [];
  if (!coverage) return null;

  return (
    <div className="mt-2.5 border-t border-dozer-muted/30 pt-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dozer-muted">
        Blind zones
      </p>
      {zones.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-dozer-body">
          No gap larger than 1.5 m² inside the working radius.
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {zones.map((z) => (
            <li key={z.id} className="flex items-baseline gap-1.5 text-[12.5px] text-dozer-body">
              <span
                className="mt-[3px] inline-block h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: COLORS.warning }}
                aria-hidden="true"
              />
              <span>
                <strong className="font-medium text-dozer-heading">{z.sector}</strong>
                <span className="font-mono tabular-nums">, {z.distance.toFixed(1)} m</span>
                <span className="text-dozer-muted"> · {z.area.toFixed(0)} m²</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Who is currently visible. This is the label half of the blind-zone signal —
 * the ring under a worker changes colour in the scene, and this names the state
 * in words so colour is never carrying it alone.
 */
function WorkerRoll() {
  const coverage = useCoverageStore((s) => s.workerCoverage);
  const direct = useCoverageStore((s) => s.workerOperator);
  const selectedId = useCoverageStore((s) => s.selectedWorkerId);
  const onSelect = useCoverageStore((s) => s.selectWorker);

  const seen = WORKERS.filter((_, i) => direct[i] || (coverage[i] ?? 0) > 0).length;
  const total = WORKERS.length;

  return (
    <div className="mt-2.5 border-t border-dozer-muted/30 pt-2.5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dozer-muted">Workers</p>
        <p
          className="font-mono text-[11.5px] tabular-nums"
          style={{ color: seen === total ? COLORS.heading : COLORS.warning }}
        >
          {seen} of {total} seen
        </p>
      </div>

      <ul className="mt-1 flex flex-col gap-0.5">
        {WORKERS.map((w, i) => {
          const n = coverage[i] ?? 0;
          const inSight = direct[i] ?? false;
          const ok = inSight || n > 0;
          return (
            <li key={w.id}>
              <button
                type="button"
                onMouseEnter={() => onSelect(w.id)}
                onMouseLeave={() => onSelect(null)}
                onFocus={() => onSelect(w.id)}
                onBlur={() => onSelect(null)}
                onClick={() => onSelect(selectedId === w.id ? null : w.id)}
                className={`flex w-full items-baseline gap-1.5 rounded-[4px] px-1 py-0.5 text-left text-[12px] transition-colors hover:bg-dozer-page focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dozer-yellow ${
                  selectedId === w.id ? 'bg-dozer-page' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mt-[5px] inline-block h-2 w-2 shrink-0"
                  style={{
                    backgroundColor: inSight ? COLORS.operator : n > 0 ? COLORS.coverage : COLORS.warning,
                    // Different shape as well as different colour.
                    borderRadius: ok ? '9999px' : '1px',
                    transform: ok ? 'none' : 'rotate(45deg)',
                  }}
                />
                <span className="flex-1 text-dozer-body">
                  <span className="text-dozer-heading">{w.label}</span>{' '}
                  {inSight ? (
                    <span className="text-dozer-muted">
                      in the operator&rsquo;s direct sight
                    </span>
                  ) : n > 0 ? (
                    <span className="text-dozer-muted">
                      on camera only, {n} camera{n > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <strong className="font-medium" style={{ color: COLORS.warning }}>
                      in a blind zone
                    </strong>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[10.5px] leading-snug text-dozer-muted">
        Drag any worker across the ground to test a spot.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- controls -*/

export function MachineSwitch() {
  const machineKey = useCoverageStore((s) => s.machineKey);
  const setMachine = useCoverageStore((s) => s.setMachine);
  return (
    <div>
      <GroupLabel>Machine</GroupLabel>
      <Segmented
        label="Machine"
        value={machineKey}
        onChange={setMachine}
        options={MACHINE_KEYS.map((k: MachineKey) => ({ key: k, label: MACHINES[k].label }))}
      />
    </div>
  );
}

export function EnvironmentSwitch() {
  const environment = useCoverageStore((s) => s.environment);
  const setEnvironment = useCoverageStore((s) => s.setEnvironment);
  return (
    <div>
      <GroupLabel>Environment</GroupLabel>
      <Segmented
        label="Environment"
        value={environment}
        onChange={setEnvironment}
        size="sm"
        options={ENVIRONMENT_KEYS.map((k: EnvironmentKey) => ({
          key: k,
          label: ENVIRONMENTS[k].label,
        }))}
      />
    </div>
  );
}

export function ArticulationControls() {
  const machineKey = useCoverageStore((s) => s.machineKey);
  const rig = useCoverageStore((s) => s.rig);
  const setRig = useCoverageStore((s) => s.setRig);
  const machine = MACHINES[machineKey];
  const limits = machine.limits;
  const slew = machine.rig.type === 'slew';

  return (
    <div>
      <GroupLabel>Articulation</GroupLabel>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
        <div className="sm:w-[190px]">
          <Slider
            label={slew ? 'Slew' : 'Steering'}
            value={rig.swing}
            min={limits.swing.min}
            max={limits.swing.max}
            step={1}
            unit="°"
            onChange={(v) => setRig({ swing: v })}
          />
        </div>
        <div className="sm:w-[190px]">
          <Slider
            label={slew ? 'Boom' : 'Loader arms'}
            value={rig.arm}
            min={limits.arm.min}
            max={limits.arm.max}
            step={1}
            unit="°"
            hint="− raises"
            onChange={(v) => setRig({ arm: v })}
          />
        </div>
      </div>
    </div>
  );
}

export function CameraControls() {
  const machineKey = useCoverageStore((s) => s.machineKey);
  const cameras = useCoverageStore((s) => s.cameras);
  const showAll = useCoverageStore((s) => s.showAllCameras);
  const selectedId = useCoverageStore((s) => s.selectedCameraId);
  const toggleCamera = useCoverageStore((s) => s.toggleCamera);
  const selectCamera = useCoverageStore((s) => s.selectCamera);
  const setShowAllCameras = useCoverageStore((s) => s.setShowAllCameras);
  const machine = MACHINES[machineKey];

  return (
    <div>
      <GroupLabel>Cameras</GroupLabel>
      <Segmented
        label="Camera set"
        value={showAll ? 'all' : 'single'}
        onChange={(v) => setShowAllCameras(v === 'all')}
        size="sm"
        options={[
          { key: 'all', label: 'All cameras' },
          { key: 'single', label: 'Single front' },
        ]}
      />
      {!showAll ? (
        <p className="mt-1.5 text-[10.5px] leading-snug text-dozer-body">
          A typical fixed single-camera install, solved the same way.
        </p>
      ) : null}

      <ul className="mt-1.5 flex flex-col gap-0.5">
        {cameras.map((c) => {
          const mutedBySingle = !showAll && c.id !== machine.singleCameraId;
          return (
            <li key={c.id}>
              <div
                className={`flex items-center gap-1.5 rounded-[5px] px-1 py-1 ${
                  selectedId === c.id ? 'bg-dozer-yellow/12 ring-1 ring-dozer-yellow/50' : ''
                }`}
              >
                <input
                  id={`cam-${c.id}`}
                  type="checkbox"
                  checked={c.enabled && !mutedBySingle}
                  disabled={mutedBySingle}
                  onChange={() => toggleCamera(c.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-[#fdac13] disabled:opacity-40"
                />
                <label
                  htmlFor={`cam-${c.id}`}
                  className={`flex-1 cursor-pointer text-[12px] ${
                    mutedBySingle ? 'text-dozer-muted line-through' : 'text-dozer-body'
                  }`}
                >
                  {c.label}
                </label>
                <button
                  type="button"
                  onClick={() => selectCamera(selectedId === c.id ? null : c.id)}
                  aria-pressed={selectedId === c.id}
                  className="rounded-[4px] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-dozer-muted hover:text-dozer-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dozer-yellow"
                >
                  {selectedId === c.id ? 'Editing' : 'Edit'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Only rendered when a camera is selected. */
export function CameraEditControls() {
  const cameras = useCoverageStore((s) => s.cameras);
  const selectedId = useCoverageStore((s) => s.selectedCameraId);
  const updateCamera = useCoverageStore((s) => s.updateCamera);
  const selected = cameras.find((c) => c.id === selectedId) ?? null;
  if (!selected) return null;

  return (
    <div>
      <GroupLabel>Edit — {selected.label}</GroupLabel>
      <p className="mb-1.5 text-[10.5px] leading-snug text-dozer-body">
        Drag the gizmo in the scene to move it on the {selected.mount} body.
      </p>
      <div className="flex flex-col gap-1.5">
        <Slider
          label="Yaw"
          value={selected.yaw}
          min={CAMERA_EDIT_LIMITS.yaw.min}
          max={CAMERA_EDIT_LIMITS.yaw.max}
          step={CAMERA_EDIT_LIMITS.yaw.step}
          unit="°"
          onChange={(v) => updateCamera(selected.id, { yaw: v })}
        />
        <Slider
          label="Pitch"
          value={selected.pitch}
          min={CAMERA_EDIT_LIMITS.pitch.min}
          max={CAMERA_EDIT_LIMITS.pitch.max}
          step={CAMERA_EDIT_LIMITS.pitch.step}
          unit="°"
          onChange={(v) => updateCamera(selected.id, { pitch: v })}
        />
        <Slider
          label="Horizontal FOV"
          value={selected.hFov}
          min={CAMERA_EDIT_LIMITS.hFov.min}
          max={CAMERA_EDIT_LIMITS.hFov.max}
          step={CAMERA_EDIT_LIMITS.hFov.step}
          unit="°"
          hint={selected.hFov === FOV.horizontal ? 'spec' : `spec ${FOV.horizontal}°`}
          onChange={(v) => updateCamera(selected.id, { hFov: v })}
        />
      </div>
      <p className="mt-1 font-mono text-[10px] text-dozer-muted tabular-nums">
        {selected.mount} · x {selected.position[0].toFixed(2)} y {selected.position[1].toFixed(2)} z{' '}
        {selected.position[2].toFixed(2)} m
      </p>
    </div>
  );
}

export function ViewControls() {
  const showGround = useCoverageStore((s) => s.showGround);
  const showFrusta = useCoverageStore((s) => s.showFrusta);
  const setShowGround = useCoverageStore((s) => s.setShowGround);
  const setShowFrusta = useCoverageStore((s) => s.setShowFrusta);
  const reset = useCoverageStore((s) => s.reset);

  return (
    <div>
      <GroupLabel>View</GroupLabel>
      <Check label="Ground coverage" checked={showGround} onChange={setShowGround} />
      <Check label="Camera frusta" checked={showFrusta} onChange={setShowFrusta} />
      <button
        type="button"
        onClick={reset}
        className="mt-1.5 w-full rounded-[6px] border border-dozer-muted/50 px-2 py-1.5 text-[12px] font-medium text-dozer-heading transition-colors hover:border-dozer-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dozer-yellow"
      >
        Reset view and cameras
      </button>
    </div>
  );
}

/** Corner brackets pointing out to enter, in to exit. */
export function FullscreenIcon({ exiting, size = 12 }: { exiting: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d={
          exiting
            ? 'M5 1v4H1M7 1v4h4M5 11V7H1M7 11V7h4'
            : 'M1 4V1h3M11 4V1H8M1 8v3h3M11 8v3H8'
        }
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpecFootnote() {
  return (
    <p className="font-mono text-[9.5px] leading-relaxed text-dozer-muted">
      {FOV.horizontal}° × {FOV.vertical}° ({FOV.diagonal}° diag) per camera ·{' '}
      {RANGE.effective} m effective range. Range and mount positions are placeholders
      pending hardware confirmation.
    </p>
  );
}
