# 慢慢 · Little by Little

A polished two-page, frontend-only mood diary based on **lec2.pptx, slide 35**. Built with React, TypeScript and Vite. The existing Scala project is untouched.

## Run

```sh
cd /Users/wutong/Projects/untitled/frontend
npm install
npm run dev
```

Open the local address printed in the terminal. `npm run build` checks TypeScript and creates the production site in `dist/`.

## Two pages

- **今日心情** (`#today`): illustrated garden, five moods, writing prompts, optional title and tags, save, calendar, recent entries.
- **时光手记** (`#memories`): read entries, search, filter by mood, export a JSON backup, and delete with confirmation.

Entries live in this browser's localStorage. They do not synchronize between devices. Clearing browser data removes them, so export important entries. Example entries are explicitly labeled and are never saved as personal records. The first real entry replaces the examples.

## Your video

No video has been generated. The homepage already has a muted, looping, inline video layer with the illustration as its poster.

1. Save your clip as `public/media/manman-loop.mp4`.
2. Copy `.env.example` to `.env.local`.
3. Add `VITE_HERO_VIDEO=/media/manman-loop.mp4` to `.env.local`.
4. Restart the development server (or rebuild for production).

A landscape clip with the character on the right and quiet space on the left fits best. The video is decorative and muted. The garden illustration remains below it if the video cannot load.

## Character and artwork

**慢慢** is a gentle caramel-colored capybara with rosy cheeks and a little leaf on its head. It carries a diary and takes time to notice small joys. The original illustration is at `public/media/manman-garden.png` and was made using the built-in image-generation tool. The exact art brief is in `ARTWORK.md`. This is also a useful starting frame for your own video.

The UI uses local illustration and icons. Google Fonts improves typography when connected; system serif/sans-serif fonts serve as fallbacks. No backend, accounts, or analytics are used.
