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

**1. The pilot fee has no amount yet.** The offer is one machine, 45 days, one small
fee — but the figure itself has not been set, so `PILOT.price` reads
`"One flat fee — confirm the amount"`. The close slide renders any value still
containing "confirm" or "TBC" in yellow with a warning beneath it, rather than setting
an unconfirmed number quietly in the same type as everything else. Put the amount in
`PILOT` and the warning styling disappears on its own.

Everything the close chapter says about the offer — the slide, its heading, the step
title and the speaker notes — is read from `PILOT`, so that is the only place to change
it.

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

## The mobile app chapter

The pieces are in place; the content waits on the recording.

```
components/mobile/PhoneFrame.tsx   neutral phone body, sized by SCREEN height
components/mobile/Clip.tsx         one looping clip, with all the autoplay caveats
scripts/make-clips.mjs             cuts the recording into those clips
scripts/clips.manifest.json        the cut list — currently empty
public/clips/                      where the encoded clips land
```

### Producing the clips

Put the raw recording at `assets/` (gitignored — it is the large master, and only
the small cut clips belong in the repo), list the sections in
`scripts/clips.manifest.json`, then:

```bash
# ffmpeg from PATH, or point FFMPEG at one:
FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") \
  node scripts/make-clips.mjs

node scripts/make-clips.mjs --only alerts   # just one, while tuning its timing
```

Each manifest entry emits three files: `<name>.webm` (VP9, preferred),
`<name>.mp4` (H.264, universal fallback) and `<name>.jpg` (first frame). Both
encodes are silent — the clips autoplay, autoplay requires muting, so an audio
track would be dead weight in every byte a prospect downloads.

The script exists rather than a one-off command because clips are binaries, and a
binary in a repo with no recipe next to it is something nobody can regenerate when
the app UI changes. Edit the manifest, re-run, commit.

### Why `Clip.tsx` is more than a `<video>` tag

`muted` and `playsInline` together are what make autoplay legal — without both,
the rep gets a frozen frame with a play button on it in front of a prospect.
`play()` rejects under autoplay policy, so it is caught and falls back to the
poster rather than leaving an uncaught rejection on every step change. Clips only
mount while their step is on screen, because a chapter of recordings would
otherwise decode all of them at once on a laptop already running WebGL and
screen-sharing. Returning to a step restarts the clip from the top. And under
`prefers-reduced-motion` nothing autoplays at all.

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

`components/camera-coverage/` is ported unmodified from
`NinetyoneCreative/3dCameras`. Its own README in that directory is the reference for
the coverage solver, the GLB contract, the placeholder values still awaiting hardware
confirmation, and what the seams and blind zones actually mean. The deck consumes it
through `initialMachine` / `initialEnvironment` props and keeps it mounted across all
four steps of chapter 3, so switching steps does not re-download a 4MB GLB or reset the
orbit camera.

---

## Deploying

Netlify, from `netlify.toml`: `npm run build` publishing `out/`. The site is served
`noindex, nofollow` both as a header and in the document head — it is an internal sales
tool and has no business turning up in a search result for a prospect who was never
shown it.
