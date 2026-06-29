# Audio assets (optional)

The game sounds complete with **fully synthesized** audio — no files are
required. If you want to replace the synth with real recordings, drop files
here using the exact names below. Any file that is present is used; any file
that is missing falls back to the built-in synth automatically.

> Tip: only `.mp3` is wired up by default (widest browser support). To use
> `.ogg`/`.wav`, change the extensions in `js/audio.js` (`SFX_FILES` /
> `MUSIC_FILES`).

## Sound effects → `assets/audio/`
| file          | played when                |
|---------------|----------------------------|
| `brick.mp3`   | a brick is destroyed       |
| `crack.mp3`   | a multi-hit brick is hit   |
| `paddle.mp3`  | ball hits the paddle       |
| `wall.mp3`    | ball hits a wall           |
| `laser.mp3`   | laser fires                |
| `bomb.mp3`    | bomb detonates             |
| `powerup.mp3` | a power-up is collected     |
| `dead.mp3`    | a life is lost             |

## Background music (one looping track per world) → `assets/audio/`
| file                  | world   |
|-----------------------|---------|
| `music-space.mp3`     | Space   |
| `music-ice.mp3`       | Ice     |
| `music-volcano.mp3`   | Volcano |
| `music-cyber.mp3`     | Cyber   |
| `music-temple.mp3`    | Temple  |

Tracks are looped seamlessly, so use loop-ready files.

### Where to find royalty-free audio
- https://freesound.org (CC0 / CC-BY sound effects)
- https://opengameart.org (game music & SFX)
- https://pixabay.com/music (royalty-free music)

Always check each file's license before shipping it.
