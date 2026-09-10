# Camera coverage module

Interactive 3D view of what a machine-mounted camera package actually covers, and
where it does not.

- `/demo/camera-coverage` — preview page
- `/embed/camera-coverage` — bare module for iframing into the marketing site

The module renders no heading or body copy of its own. Whatever page it sits on
owns all the words.

**Layout.** On desktop the scene takes the whole frame and the controls float on
its edges — stats top left, view switches and legend bottom left, machine /
environment / cameras in a right rail, articulation along the bottom. Below
1024 px there is no spare canvas to float anything on, so the same controls stack
underneath the scene instead. `CameraCoverage` picks the arrangement; the control
components in `ControlPanel.tsx` are exported individually and do not know which
one they are in.

```
components/camera-coverage/
  CameraCoverage.tsx        exported component — canvas + UI shell, WebGL fallback, keyboard, a11y summary
  CameraCoverageClient.tsx  'use client' boundary that dynamically imports the above with ssr: false
  Scene.tsx                 lights, fog, machine, camera rigs, workers, and the three drag modes
  Environment.tsx           ground surfaces and props for the four environments (scenery only)
  Workers.tsx               the draggable jobsite workers
  Machine.tsx               GLB loader + rig groups, node-name validation, pivot cross-check
  CameraRig.tsx             one camera: gizmo, frustum wedge, hit target
  CoverageGround.tsx        coverage DataTexture + working-radius ring
  ControlPanel.tsx          machine switch, toggles, sliders, readout
  coverage.ts               the solver (no three.js — plain maths, runs anywhere)
  store.ts                  small zustand store
  config.ts                 ALL tunable values
  types.ts
```

Everything tunable is in `config.ts`. No component hard-codes a metre, a degree or
a colour.

---

## Placeholders — what is not confirmed yet

Every unconfirmed value carries a `// PLACEHOLDER` comment in `config.ts`. In full:

| Value | Where | Status |
|---|---|---|
| `FOV` = 110° H × 80° V × 120° D | `config.ts` | **Confirmed** hardware spec |

| `RANGE.effective` = 15 m, `RANGE.max` = 25 m | `config.ts` | **PLACEHOLDER** — unconfirmed |
| All nine camera `position` vectors | `MACHINES.*.cameras` | **PLACEHOLDER** — see below |
| `limits.swing` / `limits.arm` per machine | `MACHINES.*.limits` | **PLACEHOLDER** — chosen to look right, not the real envelopes |
| `footprintRadius` per machine | `MACHINES.*` | Measured from the supplied GLBs; re-measure if you swap a model |
| `WORKERS` start positions | `config.ts` | Chosen so both machines start with at least one worker seen and one in a blind zone |
| `OCCLUSION.mountClearance` = 0.75 m | `config.ts` | Modelling constant, see *Occlusion* below |
| `OPERATOR.hFov` / `vFov` / `pitch` | `config.ts` | **PLACEHOLDER** — a modelled seated arc, not a measured ISO 5006 study |
| `MACHINES.*.operator.eye` | `config.ts` | **PLACEHOLDER** — fitted to the cab shell in each GLB, not to a seat reference point |

`yaw` and `pitch` for every camera are exactly as specified in the brief and were
not changed.

### About the camera positions

The brief supplied provisional mount positions. Several of them did not sit on the
supplied geometry — the wheel loader's front camera at `z = 2.8` was ~0.4 m past
the end of the front frame and 1.7 m above it, and the excavator's front-right
camera at `x = 1.3` was outboard of the house, which ends at `x = 1.11`. Left as
given, the gizmos float in mid-air and the coverage solve is answering a question
about a camera that is not on the machine.

So each `position` was fitted to the actual surface of its mount node. **The
comment on every camera line records the value the brief proposed and why it
moved**, so the hardware side can see exactly what changed. `id`, `label`, `mount`,
`yaw` and `pitch` are untouched.

---

## Swapping a GLB

1. Drop the new file in `public/models/`.
2. Point `MACHINES.<key>.glb` at it.
3. Make sure the file satisfies the contract below.
4. Update `MACHINES.<key>.pivots` and `MACHINES.<key>.colliders` to match.
5. Re-run `npm run verify:coverage` and check the seams are still where you expect.

### The contract a model must satisfy

**Axes and scale.** `+X` machine right, `+Y` up, `+Z` machine forward. Metres.
Ground plane at `y = 0` — the model's lowest point should sit on it.

**Named nodes.** One mesh node per rig part, named to match
`MACHINES.<key>.rig.nodes`:

| Rig type | Required node names (as shipped) | Moves how |
|---|---|---|
| `slew` | `tracks`, `house`, `boom` | `house` yaws about `+Y`; `boom` pitches about `+X` |
| `articulated` | `chassis_rear`, `chassis_front`, `loader_arms` | `chassis_front` yaws about `+Y`; `loader_arms` pitches about `+X` |

The names are read from config, so you can rename them there instead of in Blender.

**Hierarchy.** `base → swinging part → arm`, i.e. `tracks → house → boom` and
`chassis_rear → chassis_front → loader_arms`.

**Origins.** Each node's origin must be its real pivot, and its geometry must be
expressed relative to that origin. Nothing in the code corrects an offset.

- `house` / `chassis_front`: origin on the vertical rotation axis (the slew ring,
  or the centre articulation joint), **at ground level**. Putting it at ground
  level is what makes a camera's `y` read directly as height above the ground.
- `boom` / `loader_arms`: origin on the pin it rotates about.

**On load** the parsed node tree is logged to the console. A missing node throws a
readable error naming what was expected and what was found, rather than silently
rendering a machine that will not articulate. If a node's baked translation drifts
more than 2 cm from `config.pivots`, you get a console warning — the solver builds
its transforms from config, so the two must agree or the maths and the picture
diverge.

### Negative arm angles raise

`limits.arm.min` is the raised end. This follows from a right-handed rotation about
`+X` with `+Z` forward, and matches both rigs.

---

## How coverage is solved

`coverage.ts`, no three.js, ~19 ms for a full grid.

A ground cell is covered if it falls inside **any** enabled camera's frustum **and**
the ray from that camera to the cell is not blocked by machine geometry.

Every cell also gets a second, independent test: can the **operator** see it directly
from the cab? That gives three exclusive states per cell — see *The operator's own
sight* below.

- **Frustum** — a true rectangular pinhole frustum, `FOV.horizontal × FOV.vertical`,
  out to `RANGE.effective`. (The drawn wedge extends to `RANGE.max` and fades; the
  coverage claim stops at `effective`.)
- **Occlusion** — simplified box colliders only, never the GLB mesh. The boxes are
  in each node's local space and inherit that node's articulation, so raising the
  loader arms really does throw a shadow across the ground ahead.
- **Grid** — `GRID.extent` 40 m at `GRID.cell` 0.25 m = 160 × 160 = 25,600 cells. A full
  solve is ~19 ms, of which roughly a third is the operator pass. It used to be 0.5 m
  and ~25 ms: the occlusion loop was building a
  string key (`"house:7"`) per box per ray to check the skip set, which was the entire
  cost. Typed-array masks made 4× the resolution 3× cheaper.
- **Throttling** — solves run behind a dirty flag (`store.revision`) with leading
  and trailing edges, at most one per `GRID.throttleMs`. Never in the frame loop.

### Occlusion — `mountClearance`

Colliders are 0.4 m voxels, so a camera bracketed flush to a deck ends up inside or
against the voxel it is bolted to, and would be blinded by its own mount. Boxes
within `OCCLUSION.mountClearance` of a lens are excluded **for that camera only** —
everything beyond still occludes it normally. Real installs use a stand-off bracket
positioned so the bodywork is not in the lens; this is the modelling equivalent.

### The operator's own sight

Green is the honest baseline the camera package is measured against. Each cell is
classified into exactly one of three states, and **the operator wins the overlap**:

| State | Colour | Meaning |
|---|---|---|
| `Operator` | green (`COLORS.operator`) | The operator can see this ground directly from the cab |
| `Camera` | neon blue (`COLORS.coverage`) | **Only** the cameras reach it — this is what the package adds |
| `Blind` | warning orange (`COLORS.warning`) | Neither the operator nor a camera can see it |

Priority matters: if blue could also mean "ground the operator could already see",
the blue area would flatter the product. It cannot. Every blue cell is ground that
is invisible from the seat.

The operator is solved with the same occluders as the cameras — the boom, the engine
deck and the loader arms take chunks out of direct sight exactly as they do in the
cab — and with the same `mountClearance` skip, since the eye point sits inside the
cab's own collider. Two things differ:

- **The arc is angular, not rectangular.** `OPERATOR.hFov` is 180°, and `tan(90°)`
  has no finite value, so the cameras' tan-based frustum test cannot express it.
  Direct sight uses an azimuth threshold (`cos` of the half-arc) plus an elevation
  band centred on `OPERATOR.pitch`. That also matches what a head does: it sweeps,
  it does not look through a rectangular window.
- **Range** matches `RANGE.effective` by default (`OPERATOR.useCameraRange`). Direct
  sight is not really range-limited; matching keeps the comparison about geometry
  rather than about how far each one reaches.

**This understates rearward direct sight.** The 180° forward hemisphere models a
seated operator with normal head movement and does not model twisting round to look
behind. Treat the split as indicative until someone runs a real ISO 5006 visibility
study on the target machines — the figures in `OPERATOR` are the ones to replace.

There is deliberately **no toggle** for the green layer. Unchecking all three cameras
already leaves green plus warning — "what the operator has without the package" — and
it does so consistently across the ground, the worker rings and the readout. A layer
switch would have left a worker's green ring sitting on ground that had just gone
blue underneath them.

Workers carry the same three states on their ground ring, and the panel names each
one in words so colour never carries the signal alone.

### The percentage

"% of the working radius covered" is measured over the annulus between
`footprintRadius` and `workingRadius`. Ground under the machine is excluded: nobody
stands there, counting it as uncovered would understate the result, and it would
flood-fill every seam into one meaningless ring through the middle.

The stats card splits that total three ways — operator / cameras add / neither. The
three shares are rounded once and the headline is their sum, so the headline can
never disagree with its own breakdown.

### Blind zones

Uncovered cells in that annulus are flood-filled into components. "Uncovered" here
means **neither** the operator nor a camera reaches it — the only definition of blind
that means anything to the person standing there. Anything at or
above `GRID.minBlindZoneArea` (1.5 m²) is named by the sector its centroid falls in,
and reported at its **nearest** approach — where a person first disappears, which is
more useful than the centroid distance. Bearings are in the operator's frame: the
slewed house on the excavator, the cab-carrying rear frame on the loader.

### Sharpness

Two things give the zones their edges, and both are in `COVERAGE_STYLE`:

- The 0.25 m grid, drawn with `NearestFilter` — interpolation would feather the
  seams into something softer than they actually are.
- An explicit rim (`edgeAlpha`, `edgeLift`) on every boundary between two states —
  green/blue as hard as blue/warning — so a zone has an outline rather than fading out.

Turn `edgeAlpha` down and the drawing goes back to a soft wash; that is the dial
to reach for if it ever reads as too technical.

### Colour

Camera-only coverage is **neon blue** (`COLORS.coverage`), overlap lifting towards
`COLORS.coverageOverlap` rather than shifting hue, so two cameras read as more of
the same rather than a different state. Direct operator sight is **green**
(`COLORS.operator`), at a flat alpha — there is no "two operators" to overlap. It is a signal colour, not a brand one: it
has to hold up on a pale studio floor, dark asphalt and mid-brown dirt alike, which
brand yellow does not. Brand yellow stays on the UI chrome so the panel still reads
as Dozer.

### The seams are real

Three 110° cameras cover 330° of 360°, leaving three seams. Because the cameras are
mounted metres apart rather than co-located at the machine centre, the seams measured
from the centre come out **wider than the nominal 10°** — roughly 15°, 20° and 22° at
8 m on the excavator. Where two wedges meet, their edge rays are offset by the mount
separation and leave a sliver neither camera sees; machine geometry widens the gaps
further at close range. They are drawn and reported as computed; nothing pads, rounds
or smooths them.

### Which figure actually moves coverage

Worth knowing before anyone specs a different optic. Sweeping one axis at a time,
with the other held at spec:

| Vertical (H fixed at 110°) | | Horizontal (V fixed at 80°) | |
|---|---|---|---|
| 50° | 81.9% | 90° | 66.8% |
| 62° | 82.7% | 100° | 74.9% |
| **80°** | **83.1%** | **110°** | **83.1%** |
| 90° | 83.2% | 120° | 91.2% |
| 100° | 83.2% | 130° | 97.5% |

(Excavator; the loader behaves the same way.) **Vertical FOV has saturated.** Past
about 70° the extra ground it gains falls inside the machine's own footprint, which
is excluded from the statistic, and the far edge is limited by `RANGE.effective`
rather than by the lens. **Horizontal is the binding constraint**, worth roughly
+0.8 percentage points per degree in this range. If more coverage is wanted, the
levers are horizontal FOV, a fourth camera, or moving the mounts — not vertical FOV.

The wheel loader has a large genuine forward blind zone: the lift arms and bucket
sit directly in front of the only forward-facing camera. Raising the arms makes it
worse (61% covered at full lift vs 75% at rest). That is real, it is a well-known
hazard on that machine, and it is left visible.

---

## Regenerating the derived data

`colliders`, `pivots` and `footprintRadius` were derived from the GLBs. If you swap
a model, re-derive them — voxelise each node at ~0.4 m, greedy-merge the occupied
voxels into boxes, and express the result in that node's local space. Then:

```bash
npm run verify:coverage   # prints coverage %, named blind zones, and every seam's angular position and width
```

The poster images in `public/` (`poster-excavator.png`, `poster-wheel-loader.png`)
are rendered from real solver output at the module's default camera framing. They
are the loading poster and the no-WebGL fallback, so if coverage changes materially
they should be re-rendered rather than left to misrepresent it.

---

## Environments

Four, switched from the panel: **Studio**, **Street**, **Dirt workzone**, **Urban**.
Ground surfaces are drawn to a canvas at runtime (`Environment.tsx`) rather than
shipped as images, so an environment costs no extra request. Each also sets its own
light balance, shadow weight and fog distance; fog is matched to the page background
so the scene fades into the page instead of ending on a hard horizon.

**Environment geometry is scenery and never occludes.** The solver reads the
machine's colliders and nothing else, so switching environments cannot move the
percentage — the claim stays about the camera package, not about where someone
happened to park a cone. Props that would genuinely block a lens are kept outside
the working radius, and the footway is laid at grade rather than on a kerb upstand,
because a raised slab would sit over the coverage overlay and hide cells the
percentage is still counting.

## Workers

`WORKERS` in config defines how many there are and where they start. Each is
draggable, and each one's state comes from the same solver function the ground grid
uses, evaluated at their feet — so a worker standing in a seam registers as not
seen and can never disagree with the coverage drawn underneath them.

State is never carried by colour alone: an unseen worker gets a pulsing ring **and**
a floating alert marker, the panel names them in words, the list marker changes
shape as well as colour, and the off-screen summary reads out who is unseen.

## Embedding on the marketing site

`/embed/camera-coverage` is the module and nothing else — no heading, no copy, no
outer max-width. Paste this on the host page:

```html
<iframe
  id="dozer-coverage"
  src="https://YOUR-HOST/embed/camera-coverage"
  title="Dozer.ai camera coverage"
  loading="lazy"
  style="width:100%;border:0;display:block;height:832px"
  allow="accelerometer; gyroscope"
></iframe>

<script>
  (function () {
    var ORIGIN = 'https://YOUR-HOST';
    var el = document.getElementById('dozer-coverage');
    window.addEventListener('message', function (e) {
      if (e.origin !== ORIGIN) return;
      if (!e.data || e.data.type !== 'dozer-coverage:height') return;
      el.style.height = e.data.height + 'px';
    });
  })();
</script>
```

The script is what makes it fit on a phone. The module is ~832 px tall on desktop
and ~1290 px on a phone, where the controls stack under the scene, so a single
fixed height either clips the phone layout or leaves a gap on desktop. The embed
measures itself and posts `{ type: 'dozer-coverage:height', height }` to the parent;
the snippet resizes the iframe to match. Without the script the iframe just stays
at whatever height the `style` attribute says, which is a usable fallback on
desktop only.

Always compare `e.origin` — anything can post a message to a window.

`allow="fullscreen"` is not optional if you want the full-screen button. Without
it the browser refuses fullscreen for the frame, `document.fullscreenEnabled` is
false, and the module hides the button rather than offering one that does nothing.

### Query parameters

| Parameter | Values | Default |
|---|---|---|
| `machine` | `excavator`, `wheelLoader` | `excavator` |
| `env` | `studio`, `street`, `dirt`, `urban` | `studio` |
| `height` | a CSS length, e.g. `900px` | `800px` desktop, `640px` below 1024 px |
| `bg` | any CSS colour, or `transparent` | `#f4f7f9` |

So a loader on a dirt site, taller:
`…/embed/camera-coverage?machine=wheelLoader&env=dirt&height=900px`

`height` sets the **desktop** height of the scene. The floating controls are
positioned against its edges and the right rail scrolls if it ever runs out of
room, so the default 800 px is a floor rather than a ceiling — raise it for a
taller hero, lower it and the rail simply scrolls. Anything that is not a plain
CSS length is ignored, so the parameter cannot be used to inject styles.

### Locking down who can embed it

By default any site can iframe it, which is what you want while staging. Set
`EMBED_FRAME_ANCESTORS` in the deploy environment to restrict it:

```
EMBED_FRAME_ANCESTORS="https://dozer.ai https://*.dozer.ai https://*.webflow.io"
```

That becomes a `Content-Security-Policy: frame-ancestors` header on `/embed/*`.

## Behaviour notes

- **Orbit** — damped, clamped above the ground plane, zoom constrained. Auto-rotates
  slowly until the first user input, then stops permanently. No auto-rotate under
  `prefers-reduced-motion`.
- **Machine switch** — keyed off `MACHINES`; both GLBs are preloaded on idle, and the
  orbit position is preserved across the switch rather than reset.
- **Keyboard** — focus the canvas: arrows orbit, `+`/`-` zoom, `[`/`]` swing,
  `;`/`'` move the arm, `F` toggles full screen. Every control is a native
  focusable input.
- **Full screen** — the icon in the bottom-right corner of the scene, or `F`. It
  takes the scene element fullscreen, so the floating controls go with it; the
  module's own frame, border and radius drop away and the browser sizes it to the
  screen. The button is icon-only and carries its label on `aria-label`/`title`;
  it grows to a 44 px target on coarse pointers. It renders nothing at all where
  the API is unavailable — iOS Safari has none for non-video elements, and an
  iframe needs `allow="fullscreen"` from the host — rather than offering a control
  that would do nothing.
- **Screen readers** — an off-screen `aria-live` summary describes the machine pose,
  active cameras, coverage percentage, every named blind zone, the environment, and
  which workers are unseen, in prose. Blind zones are never signalled by colour alone.
- **No WebGL** — renders the poster plus copy. It does not crash the page.
- **Fonts** — Share Tech Mono loads via `next/font`. Gotham is licensed and cannot be
  fetched from a CDN: drop the webfont files in `public/fonts/` and uncomment the
  `@font-face` blocks in `app/globals.css`. Until then it falls back to Montserrat
  and then the system stack.
