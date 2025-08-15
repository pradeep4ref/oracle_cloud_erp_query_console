# Recording UI GIFs (macOS)

This repo shows GIFs in the README. Here are simple ways to create them on macOS.

## Easiest: LICEcap (records straight to GIF)

1. Install: `brew install --cask licecap`
2. Open LICEcap → drag/resize the capture window over the UI
3. Set FPS to 10–15, click Record → save as `docs/ui-demo.gif`
4. Keep it under ~10–20 seconds to avoid huge files

Pros: dead simple, 1-file GIF. Cons: larger file size than advanced encoders.

## Polished: Kap (nice UI, trimming, export)

1. Install: `brew install --cask kap`
2. Use the Kap menubar icon → choose area capture
3. Record, trim, and export as GIF → save to `docs/ui-demo.gif`

## Free + built-in: QuickTime + conversion

1. Open QuickTime Player → File → New Screen Recording
2. Record and save to `docs/ui-demo.mov`
3. Convert to GIF with Homebrew tools:

```
brew install ffmpeg gifski
mkdir -p /tmp/ui-gif-frames
ffmpeg -i docs/ui-demo.mov -vf scale=1280:-1 -r 12 /tmp/ui-gif-frames/out%04d.png
gifski -o docs/ui-demo.gif --fps 12 /tmp/ui-gif-frames/out*.png
rm -rf /tmp/ui-gif-frames
```

Tips:
- Prefer 1280px width (or 1x pixel ratio) to keep file size small
- 10–15 FPS is usually smooth enough for UI demos
- Keep length short; show only the key interaction
- Use light cursor highlights if available

If your GIFs are very large, consider using Git LFS or compressing further.


