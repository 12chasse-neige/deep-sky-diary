# 深空手记 · Deep Sky Diary

A two-page personal deep-sky observation journal built with React, TypeScript and Vite.

The 中 / EN button on the sign-in screen and diary header switches between Chinese and English. It remembers the browser's preference, updates the page language and title, and preserves drafts while switching. Interface messages, calendars, sky choices and fictional examples are translated; personal notes and saved observation values remain exactly as entered. Only the language preference is stored in browser localStorage (`deep-sky-language`).

## Run

```sh
cd /Users/wutong/Projects/vibe-coding-webpage/frontend
npm install
npm run dev
```

`npm run build` checks TypeScript and builds the production site in `dist/`.

- **观测台** (`#today`): panorama, observation form, personal counts and recent entries. `#write` links directly to the form.
- **星空档案** (`#memories`): search by object, location, equipment or notes; filter by object type; read, export JSON and delete observations with confirmation.

Each entry stores an object name/catalog ID, type, observation date, location, separate telescope/optics and camera notes, qualitative sky conditions and field notes. Optional fields record paired latitude/longitude in signed decimal degrees, seeing in arcseconds, cloud cover and relative humidity in percent. Older combined equipment notes remain visible in record details. Date, object and notes are required. Examples are fictional, labeled, excluded from counts and exports, and replaced by the first personal record.

Accounts and observations are stored in PostgreSQL through the Scala backend. Start the API before using the frontend; see [backend setup](../README.md). The app does not read or write diary records in browser storage. Existing browser records are left intact, with no automatic import.

## Background

The user-provided generated panorama is copied from `../assets/images/Scorpius–Sagittarius-Milky-Way-core-panorama.png` to `public/media/deep-sky-panorama.png`. It is decorative artwork, not a calibrated sky chart. The previous garden art is retained but no longer used. The finished video from `../assets/videos/site-background.mov` is bundled as `public/media/deep-sky-loop.mp4` and plays by default as the fixed, full-page background on both diary pages, with a contrast veil above it.

Google Fonts is optional; system fonts provide fallbacks. No analytics.

## Editing in an IDE

Open the `frontend` folder as the project, or select its `package.json` in the existing workspace. Use the local TypeScript version from `node_modules/typescript` for React/TypeScript completion. The `dev` script starts the live preview; edits refresh automatically.

The backdrop is implemented in `src/components/SkyBackground.tsx`; system motion preferences are handled by `src/hooks/useReducedMotion.ts`.

### Source map

| File or folder                       | What to change here                                                       |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `src/App.tsx`                        | Page composition, navigation, homepage copy, archive search and export    |
| `src/components/ObservationForm.tsx` | Input fields, validation and observation draft behavior                   |
| `src/components/EntryCard.tsx`       | Compact observation previews on both pages                                |
| `src/components/EntryDialog.tsx`     | Full record view and deletion confirmation                                |
| `src/types.ts`                       | Shared observation schema                                                 |
| `src/data/objectKinds.ts`            | Object category labels and icons                                          |
| `src/data/sampleEntries.ts`          | Clearly labeled fictional example records                                 |
| `src/hooks/useEntries.ts`            | Load/create/delete records through the backend and discard stale requests |
| `src/lib/api.ts`                     | HTTP requests, credentials and error handling                             |
| `src/lib/date.ts`                    | Local calendar date helper                                                |
| `src/styles/global.css`              | Colors, typography, base controls and focus styles                        |
| `src/styles/layout.css`              | Header, hero image, shared buttons and page frame                         |
| `src/styles/journal.css`             | Observation form and sidebar                                              |
| `src/styles/archive.css`             | Cards, archive, dialog, notifications and footer                          |
| `src/styles/responsive.css`          | Desktop/mobile breakpoints and reduced-motion settings                    |
| `public/media/deep-sky-panorama.png` | Hero background image                                                     |

Styles load in the order listed in `src/main.tsx`, with responsive overrides followed by motion/accessibility rules. Start with the variables in `global.css` to change the theme. The full-page image crop and shading are in `layout.css`, with mobile adjustments in `responsive.css`.

Comments explain persistence, sample-data isolation, local dates and native modal behavior. Stored category IDs and field names should remain stable; changes must be reflected in backend validation and database migrations. Form fields are required only where marked in the component. Date, location, coordinates, telescope, camera and sky conditions stay filled after a successful save to make logging multiple targets easier. Custom calendar and sky pickers use keyboard navigation and adapt to available screen space; validation uses inline messages.

### Formatting and validation

```sh
npm run format        # Format readable source, styles and documentation
npm run format:check  # Check formatting without changing files
npm run build         # Type-check and build the production bundle
```

Prettier is installed locally and configured in `.prettierrc.json`. `.editorconfig` supplies UTF-8, two-space indentation and consistent line endings for IntelliJ and other editors. Configure your IDE's Prettier integration to use this project's local package if you want formatting on save. Generated `dist/`, test output and dependencies are excluded from formatting.

## Full-page background video

The finished ten-second video is enabled by default, with no environment setup required. Its web export is 1920 × 1080 H.264 MP4, without audio and with fast-start metadata. The original 4K ProRes source remains in `../assets/videos/site-background.mov`.

To replace it, put a new clip at `public/media/deep-sky-loop.mp4`, or copy `.env.example` to `.env.local` and set `VITE_SKY_VIDEO` to another public video URL. Restart the development server or rebuild after changing environment settings. Set `VITE_SKY_VIDEO=` to use only the static panorama.

`SkyBackground.tsx` plays the clip muted, inline and on repeat, at its original speed. The site does not trim or retime it. The static panorama stays underneath while loading, if autoplay is blocked, or if the clip fails. Sign-in screens keep the static panorama.

Adjust `.sky-media` and `.sky-veil` in `src/styles/layout.css` to change the crop and darkness. The mobile crop is in `responsive.css`. `src/styles/motion.css` holds the background drift, entrance animations, orbital motion and accessibility overrides. The header pause button stops interface motion and video playback. System reduced-motion settings disable motion automatically; background video also pauses while the browser tab is hidden.

The form, record previews, buttons and text use no permanent outline borders. Keyboard focus remains visible. The earlier browser storage is untouched; current observations belong to authenticated backend accounts.
