# Dozer.ai — presenter walkthrough

A standalone, presenter-led demo app for Dozer.ai sales calls. A rep screen-shares it
fullscreen and drives it from the keyboard. Eight chapters, thirty steps, roughly a
45-minute budget.

It is a static site with no backend, no runtime network calls, no analytics and no
forms. Every asset — fonts, GLBs, posters — is served from `/public`, so the deck
opens on hotel wifi that is barely working, and keeps working if the wifi drops
mid-call.

```
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
npm run typecheck
```

---

## Driving it

| Key | Does |
|---|---|
| `→` `Space` `PageDown` | Next step |
| `←` `PageUp` | Previous step |
| `1`–`8` | Jump to chapter |
| `F` | Fullscreen |
| `Esc` | Chapter overview (or close whatever is open) |
| `P` | Presenter view, in its own window |
| `L` | Laser pointer |
| `B` | Blank the screen |
| `I` | Interact with the embedded module |
| `?` | The list above, on screen |

**Clickers work with no setup.** A presentation clicker sends PageUp and PageDown and
nothing else, so those two keys advance the deck under every condition — including
interact mode, and including while a slider inside the 3D module has focus.

**Interact mode (`I`)** hands the keyboard to the embedded module on the 3D and
dashboard chapters. Until you press it the module is inert, so a stray click cannot
swing an excavator mid-sentence. While it is on, the arrow keys orbit the scene
instead of advancing the deck — the clicker keys still advance. Press `I` again, or
`Esc`, to take the deck back.

**Presenter view (`P`)** opens beside the stage: current step, speaker notes, the next
step as a live thumbnail, a clickable chapter list, and an elapsed timer with a pacing
read against the deck's own budget. Both windows drive each other over a
BroadcastChannel, so whichever one has focus, the arrows work.

**Deep links.** Every step has a hash — `#/dashboard/5` is chapter `dashboard`, step 5.
Refreshing keeps your place, and you can open the deck straight onto the chapter a
prospect asked about instead of arrowing through everything in front of it.

---

## Before you present

Two things in `lib/demoData.ts` need a human before this goes in front of anyone.

**1. The pilot terms live in one place.** One machine, 45 days, $2,500 — all in
`PILOT` in `lib/demoData.ts`. Everything the close chapter says about the offer is
read from there: the slide, its heading, the step title and the speaker notes. That
is the only place to change it.

If the price is ever reset to something containing "confirm" or "TBC", the close
slide renders it in yellow with a placeholder label and the presenter view swaps
its note for a warning — so an unset price cannot quietly reach a prospect looking
like a real one.

**2. Every figure in the demo dataset is invented.** It is not a Dozer.ai customer
result and must never be presented as one. The dashboard and the safety-event slides
both carry a permanent "sample data" chip for exactly this reason, and the speaker
notes tell the rep to say so out loud on the first dashboard step.

The dataset is internally consistent, which matters more than it sounds: the daily
series, the per-machine table and the cost-code split all reconcile to the same 748.6
engine hours and 506.0 working hours. A prospect who adds the machine rows up and gets
a different total than the KPI card stops listening to the pitch and starts auditing
the slide. **If you edit one of those, re-run the numbers through the others.**

The demo jobsite is **Smith Denison**, set in `JOBSITE` at the top of the same file.

---

## The in-cab display chapter

Chapter 5 shows the operator display running, from real site footage.

```
components/mobile/DeviceFrame.tsx   the tablet body
components/mobile/InCabDisplay.tsx  the clip plus the focus treatment
components/mobile/Clip.tsx          one looping clip, with the autoplay caveats
components/slides/InCab.tsx         the slide
scripts/make-clips.mjs              cuts the recording into clips
scripts/clips.manifest.json         the cut list
public/clips/                       the encoded clips (~1.4MB)
```

### One clip, not four

The obvious build is a clip per panel dropped into a rebuilt grid. It does not
survive contact with reality: four `<video>` elements looping independently drift
apart within seconds, and the moment they do, the display contradicts itself —
the rear feed shows a truck at 2.9m while the plan view beside it reports all
clear. On a proximity-detection demo that is the one inconsistency you cannot put
on a prospect's screen.

So it is one clip of the whole display, and the chapter walks the panels by
dimming everything else over the top. The panel rectangles in `InCabDisplay.tsx`
were measured off the recording rather than estimated — the edges were found by
scanning for the run of pixels that differ from the app's `#242331` background —
and are stored as fractions of the 1200×720 source so they hold at any size.

The dim is four strips tiled *around* the panel in focus, not a scrim on each of
the others. Scrimming the others individually left their rectangles visible as
darker patches against the app's own background; tiling covers every pixel except
the one panel at a uniform opacity, with no internal seams.

### Re-cutting the clip

Put the recording back at `incoming/` (it is deleted after cutting — only the
clips belong in the repo), adjust `scripts/clips.manifest.json`, then:

```bash
FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") \
  node scripts/make-clips.mjs
```

Each entry emits `<name>.webm` (VP9), `<name>.mp4` (H.264) and `<name>.jpg`
(first frame, used as the poster and as the reduced-motion fallback). Both
encodes are silent — the clip autoplays, autoplay requires muting, so an audio
track is dead weight in every byte a prospect downloads.

The VP9 CRF is set so the WebM actually lands *under* the MP4. The browser is
offered WebM first, so if it were larger the ordering would be doing harm — at
the original CRF it was, on this footage.

### Why `Clip.tsx` is more than a `<video>` tag

`muted` and `playsInline` together are what make autoplay legal — without both,
the rep gets a frozen frame with a play button on it in front of a prospect.
`play()` rejects under autoplay policy, so it is caught and falls back to the
poster rather than leaving an uncaught rejection on every step change. The clip
only mounts while the chapter is on screen. Returning to a step restarts it from
the top. Under `prefers-reduced-motion` nothing autoplays at all.

---

## The logo

The wordmark lives at `public/logo.svg` and is used on the cover and the closing
slide. Swapping it is a file drop — replace that one file and both uses follow, with
no code change:

```
public/logo.svg     the wordmark
app/icon.svg        the browser-tab favicon (a `d` monogram, square)
```

If the replacement has different proportions, update `LOGO_RATIO` in
`components/slides/Frame.tsx` to its width ÷ height. That is the only number about
the logo anywhere in the code — call sites pass a width and the height follows, so
nothing can end up stretched or shift while the SVG loads.

The mark currently in the repo is **reconstructed, not the original file.** The logo
was supplied as an image in conversation and never reached the repo as an asset, so it
was rebuilt as real vector outlines — Montserrat ExtraBold, tightly tracked, in the
brand amber `#fdac13` — rather than traced by hand or set as live text. It is a close
match and it is resolution-independent, but **if you have the real vector file, use
it**: drop it at `public/logo.svg` and you are done.

---

## Gotham

Gotham is licensed and cannot ship in this repo, so the deck currently renders in
Montserrat — which is the fallback the design system already specifies.

To switch it on:

1. Drop the licensed webfont files into `public/fonts/` as `Gotham-Book.woff2` (400),
   `Gotham-Medium.woff2` (500) and `Gotham-Bold.woff2` (700).
2. Delete the two slashes that open the commented `@font-face` block near the top of
   `app/globals.css`.

That is the whole change. Nothing in the app names a font family directly — every rule
goes through `--font-gotham` or the Tailwind `font-sans` token — so Gotham takes over
the entire deck the moment those blocks are live.

Montserrat and Share Tech Mono are self-hosted in `public/fonts/` (51KB together, latin
subset). They are not fetched from Google at runtime *or* at build time, so the build
has no network dependency either.

---

## Layout

```
app/
  page.tsx              the stage — this is what gets screen-shared
  presenter/page.tsx    the presenter window
  globals.css           fonts, including the Gotham swap
components/
  camera-coverage/      the 3D module, ported from NinetyoneCreative/3dCameras
  dashboard/            the recreated product dashboard
  slides/               one component per slide kind, plus registry.tsx
  stage/                the 16:9 scaler, the deck orchestrator, the overlays
  presenter/
lib/
  deck.ts               the script: chapters, steps, speaker notes. Pure data.
  demoData.ts           the Smith Denison dataset + the pilot terms
  tokens.ts             every colour and the stage dimensions
  deckStore.ts          position and overlay state
  useDeckSync.ts        hash + BroadcastChannel
  useDeckKeyboard.ts    the key map
```

### Editing the script

Everything a rep says lives in `CHAPTERS` in `lib/deck.ts`. Add or remove steps freely —
step numbers, ids, hashes and the pacing total are all derived, so nothing needs
renumbering by hand.

Write `notes` as things to say, not as a description of the slide: the slide is already
on screen. A note beginning with `⚠` renders as a highlighted warning in the presenter
view rather than as prose, for things the rep must not skim past.

`lib/deck.ts` deliberately imports nothing from `components/` — the presenter window
loads the script to render its chapter list and notes, and should not have to pull
three.js across to print a heading. `components/slides/registry.tsx` is what maps a
slide `kind` onto a component.

### The stage

Every slide is authored at exactly 1920×1080 and scaled by one CSS transform to fit the
window, letterboxed on the page background. Scaling rather than reflowing is the point:
the rep and the prospect never have the same window size, and a responsive deck would
give them each a slightly different one. Verified pixel-exact at 1280×720, 1440×900,
1920×1080 and 2560×1440.

Because the canvas is fixed, the dashboard's row heights are explicit pixels rather
than flex fractions — the comment above them is the height budget. If you add a row,
take the pixels off another one on purpose.

### The 3D module

`components/camera-coverage/` is vendored from `NinetyoneCreative/3dCameras`, currently
at `004962a` ("Add the operator's direct field of view as a third colour"). Its own
README in that directory is the reference for the coverage solver, the GLB contract, the
placeholder values still awaiting hardware confirmation, and what the seams and blind
zones mean.

**Two local changes**, both of which must be re-applied when the module is updated:

| File | Change | Why |
|---|---|---|
| `store.ts` | `initialize()` also accepts `showAllCameras` | So a slide can open on the single-camera comparison without it counting as user input |
| `CameraCoverage.tsx` | `initialShowAllCameras` prop, wired into the init effect | The prop the deck drives that with |

In the store the preset is applied *after* the machine spread on purpose: switching
machines runs `initial()`, which resets `showAllCameras` to true, so setting it earlier
would be silently undone on any step that also changes machine.

To update the module: copy `components/camera-coverage/` across, re-apply the two changes
above, then re-check the figures the coverage chapter quotes — the slide copy names
specific percentages and they come from the solver, not from the script.

The deck consumes it through `initialMachine` / `initialEnvironment` /
`initialShowAllCameras` and keeps it mounted across all three steps of chapter 3, so
switching steps does not re-download a 4MB GLB or reset the orbit camera. The deck also
warms the module on idle during chapter 1 — see `useWarmCoverageModule` in
`components/stage/Deck.tsx`.

### Coverage is three colours, not one

Since `004962a` the module separates ground the operator can already see from the seat
(green) from ground **only** the cameras reach (blue), with the operator winning any
overlap so blue can never flatter the product. The coverage chapter's copy quotes the
split directly — 37/46/17 on the excavator, 37/12/51 on one camera, 26/62/12 on the
loader — so if the solver or the `OPERATOR` placeholders change, those numbers need
re-measuring. Direct sight is a modelled seated arc, not a measured ISO 5006 study, and
the speaker notes say so.

---

## Deploying

Netlify, from `netlify.toml`: `npm run build` publishing `out/`. The site is served
`noindex, nofollow` both as a header and in the document head — it is an internal sales
tool and has no business turning up in a search result for a prospect who was never
shown it.
