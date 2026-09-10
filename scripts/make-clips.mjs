#!/usr/bin/env node
/**
 * Cut a screen recording into the looping clips the mobile chapter embeds.
 *
 * Why this exists as a script rather than as a one-off command: the clips in
 * /public/clips are binaries, and a binary in a repo with no recipe beside it is
 * something nobody can regenerate six months later when the app UI changes. Edit
 * the manifest, re-run, commit.
 *
 *   node scripts/make-clips.mjs
 *   node scripts/make-clips.mjs --only alerts     # one clip while you tune it
 *   FFMPEG=/path/to/ffmpeg node scripts/make-clips.mjs
 *
 * For each manifest entry it emits three files into public/clips:
 *   <name>.webm   VP9  — smaller, preferred by browsers that take it
 *   <name>.mp4    H.264 — the universal fallback
 *   <name>.jpg    first frame, used as the poster and as the reduced-motion
 *                 and autoplay-blocked fallback
 *
 * Both encodes are silent (`-an`). These clips autoplay, and an autoplaying
 * clip has to be muted anyway — so the audio track is dead weight in every byte
 * a prospect downloads.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/clips');
const MANIFEST = resolve(ROOT, 'scripts/clips.manifest.json');

/** ffmpeg from $FFMPEG, else PATH. */
function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    console.error(
      'ffmpeg not found. Install it, or point FFMPEG at a binary:\n' +
        '  FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node scripts/make-clips.mjs',
    );
    process.exit(1);
  }
}

const FFMPEG = ffmpegBin();

function run(args) {
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  });
}

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;

if (!existsSync(MANIFEST)) {
  console.error(`No manifest at ${MANIFEST}`);
  process.exit(1);
}

const { source, width, clips } = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const SRC = resolve(ROOT, source);

if (!existsSync(SRC)) {
  console.error(
    `Source recording not found: ${SRC}\n` +
      'Put the recording there, or change "source" in scripts/clips.manifest.json.',
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

for (const clip of clips) {
  if (only && clip.name !== only) continue;

  const { name, start, duration, crop } = clip;

  /* -ss BEFORE -i seeks by keyframe, which is fast but lands on the nearest
     keyframe rather than the frame asked for. These clips are short and their
     start frames matter, so it goes AFTER -i for an exact, decoded seek. */
  const trim = ['-i', SRC, '-ss', String(start), '-t', String(duration)];

  // crop is "w:h:x:y" in source pixels; scale keeps the output an even width,
  // which both encoders require.
  const filters = [crop ? `crop=${crop}` : null, `scale=${width}:-2:flags=lanczos`]
    .filter(Boolean)
    .join(',');

  console.log(`→ ${name}  (${start}s +${duration}s)`);

  run([
    ...trim,
    '-vf', filters,
    '-an',
    '-c:v', 'libvpx-vp9',
    '-crf', '34',
    '-b:v', '0',
    // Two passes would be smaller, but these clips are seconds long and this
    // is already well under the size where it would matter.
    '-row-mt', '1',
    '-pix_fmt', 'yuv420p',
    `${OUT}/${name}.webm`,
  ]);

  run([
    ...trim,
    '-vf', filters,
    '-an',
    '-c:v', 'libx264',
    '-crf', '25',
    '-preset', 'slow',
    '-profile:v', 'high',
    // yuv420p and faststart: without the first, Safari will not decode it at
    // all; without the second, the whole file has to arrive before playback
    // starts, which on bad wifi is the difference between a clip and a freeze.
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    `${OUT}/${name}.mp4`,
  ]);

  run([
    ...trim,
    '-vf', filters,
    '-frames:v', '1',
    '-q:v', '3',
    `${OUT}/${name}.jpg`,
  ]);
}

console.log('\nDone. Clips are in public/clips.');
