# Changelog

## [2026-05-18] — UI Overhaul (GDSC-UTP Booth)

### Motivation
The game is being used as a booth game for GDSC-UTP. The previous UI was a bare prototype — plain text score, raw panels with no branding, and nothing to attract attention. The new design is built to be eye-catching from across a room and clearly branded.

### Changes Made

#### `index.html`
- Updated `<title>` to `Be The Meme! · GDSC UTP`
- Added meta description for SEO/sharing
- Added `Nunito` font import from Google Fonts

#### `src/index.css`
- Set `font-family: 'Nunito', sans-serif` globally
- Added GDSC brand color CSS variables: `--color-gdsc-red/blue/yellow/green`
- Added animation keyframes: `float`, `popIn`, `scoreFlash`, `pulseGlow`

#### `src/components/Background.jsx`
- Added a 3px GDSC four-color gradient stripe at the bottom edge (Red → Blue → Yellow → Green)
- Added soft bottom vignette glow under the stripe

#### `src/pages/Home.jsx` — full redesign
- GDSC × UTP pill badge at the top
- Massive gradient title "Be The Meme!" (white → blue/green gradient text)
- Tagline: "Strike the pose · Claim the glory" in muted uppercase
- Large glowing START GAME button with pulsing blue/green glow animation
- 8 floating emoji decorations (🎬 🤌 😱 💀 🫡 🙌 📸 🔥) with staggered float animations
- Bottom hint text for camera guidance

#### `src/pages/Game.jsx` — layout + HUD redesign
- **Fixed top HUD bar** (glassmorphism, blur) with:
  - GDSC × UTP badge (left)
  - Current meme name in uppercase (center)
  - Score pill with blue glow (right), flares brighter on score
- **Meme panel**: full-height card with cycling GDSC accent top stripe and colored glow border per meme
- **Webcam panel**: full-height card, border glows green when match > 80%
- **Match bar**: thicker (h-4), gradient fill, glows when in green zone, status text below (🔴/🟡/🟢)
- **Score popup**: on scoring, a large "+1" animates center-screen with a radial color flash behind it



## [2026-05-18] — Pose Detection Consistency Fixes

### Problems Identified
The gesture/posture comparison logic had several reliability issues that made
matching feel unpredictable and inconsistent:

1. **No scale normalization** — `normalizePose()` centered the pose on the hips
   but never scaled it. Users standing close to the camera would produce larger
   spread landmarks than users standing far away, causing the same pose to score
   very differently based purely on distance.

2. **Invisible landmarks polluted the score** — The meme pose data contains
   landmarks with `visibility < 0.1` (e.g. feet/hips that were never visible in
   the meme photo and are just model guesses). These were counted equally in the
   comparison distance, meaning users doing a perfect upper-body match were being
   penalized by garbage foot/hip coordinates.

3. **Canvas dimensions were hardcoded (800×520) while the webcam was 1280×720**
   — Because landmarks are normalized 0–1 and then multiplied by canvas W/H, a
   mismatch in aspect ratio caused the drawn skeleton overlay to not align
   correctly with the actual body in the video.

4. **Hold threshold too low (7 frames ~= ~115ms at 60fps)** — A brief accidental
   alignment with the pose could trigger a score. Raised to 15 frames (~250ms)
   for a more intentional feel.

### Changes Made

#### `src/pages/Game.jsx`

| What | Before | After |
|---|---|---|
| Scale normalization | None — only centered on hips | Divide by torso length (hip center → shoulder center distance) |
| Visibility filtering | All 33 landmarks counted | Skip any landmark with `visibility < 0.5` in either user or meme pose |
| Hold threshold | `> 7` frames | `> 15` frames |
| Canvas sizing | Hardcoded `width=800 height=520` | Dynamically synced to `video.videoWidth / videoHeight` each frame |
| Joint color | All red | Green (`#00ff88`) for confident landmarks, faded red for low-visibility ones |
| Line width | 2px white | 3px with slight transparency for clarity |
| Scoring multiplier | `exp(-avg * 6)` | `exp(-avg * 5)` — slightly more forgiving after normalization makes distances smaller |
| Count guard | None (could divide by zero) | Returns `0` early if no visible landmarks match |

### Notes
- The `VISIBILITY_THRESHOLD = 0.5` constant is defined at the top of `Game.jsx`
  and used in both `comparePoses()` and `drawLandmarks()` so they stay in sync.
- The scale normalization guard (`scale > 0.01`) prevents divide-by-zero when
  the model detects a person but shoulder landmarks are missing.
- Future meme poses added to `memes.json` should be captured with the subject
  filling most of the frame so upper-body landmarks have high visibility scores.
