# Drop recordings here

This folder is the hand-off path for getting a screen recording into the repo.

It exists because `/assets/` is gitignored — that is the right long-term home for
large masters, but it means `git add assets/whatever.mp4` silently does nothing.
This folder is **not** ignored, so a normal `git add` works.

## To hand over a recording

```bash
git checkout claude/modest-albattani-cupzbo
git pull

cp ~/Desktop/new_dashboard_recording.mov incoming/

git add incoming/
git commit -m "Add dashboard screen recording for the mobile chapter"
git push
```

Any format ffmpeg reads is fine — `.mov` straight off a phone or QuickTime,
`.mp4`, `.webm`. Don't convert or trim it first; the cut list works off the full
recording, and a re-encode before cutting only loses quality.

## If it is over ~100MB

GitHub rejects single files above 100MB and warns above 50MB. If yours is bigger:

```bash
# Roughly 10x smaller, still far above what the clips need
ffmpeg -i new_dashboard_recording.mov -vf scale=-2:1600 \
  -c:v libx264 -crf 28 -preset slow -an incoming/new_dashboard_recording.mp4
```

The clips are encoded at 800px wide, so anything 1600px or larger keeps plenty of
headroom.

## After the clips are cut

The master gets deleted from here in the same commit that adds the clips, so it
never reaches `main`. The reproducible part — the cut list — lives on in
`scripts/clips.manifest.json`.
