# Game assets

## Tankaria logo

Place the logo here:

```
assets/tankaria.png
```

- **Format:** PNG with a transparent background looks best (SVG also works
  if you change the path in `js/renderer.js`).
- **Recommended size:** a wide image around 600×180 px. It's scaled
  automatically to fit each spot, so exact dimensions aren't critical.

Once the file exists it appears automatically in three places (no code
changes needed):

1. **Menu screen** – large, above the "ARKANOID X" title.
2. **Background watermark** – large and faint behind the play area.
3. **Corner** – small, top-left, during gameplay.

If the file is missing the game simply skips the logo and runs normally.

See `assets/audio/README.md` for optional sound/music files.
