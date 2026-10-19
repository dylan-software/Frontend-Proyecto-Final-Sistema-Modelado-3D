# Frontend — 3D Space Modeling System

Web interface of the 3D space modeling project. It lets the user scan or draw a room, view it in an
interactive 3D viewer, ask an AI assistant how to organize it, and send a camera snapshot to the
backend so its AI suggests where to place furniture.

Next.js app (pages router). Talks to the backend only through `NEXT_PUBLIC_API_URL`.

## Stack
- **Next.js + React + TypeScript**
- **three.js** with **@react-three/fiber** (React renderer) and **@react-three/drei** (grid, orbit controls)
- **FastAPI** backend (separate repository), reached over HTTP

## Structure
```
src/
  pages/        index.tsx (dashboard), scan.tsx (room scanning)
  components/   Scene3D, ThreeLoader, CameraCapture, ChatPanel, RoomEditor, ObjectForm,
                CategoryAccordion, ThemeSelector, AR tools
  context/      ThemeContext (global theme state + localStorage persistence)
  render/       RenderScene (room polygon + generated layout)
  lib/api.ts    fetch wrapper around the backend API
  lib/catalog.ts  pure catalog helpers (grouping by category)
  lib/units.ts  the single cm ↔ m conversion point
  styles/       globals.css, themes.ts (the six color palettes)
  types/        shared 3D and catalog types (Vector3D, FurnitureObject, AccordionProps, API responses)
```

## Themes
The 🎨 button in the top bar switches between six palettes: **Oscuro** (professional), **Verde Neón**
(dynamic), **Morado** (creative), **Claro** (clean), **Azul Claro** (fresh) and **Gris** (minimalist).

- Each palette lives in `src/styles/themes.ts` as a set of color tokens.
- `ThemeProvider` writes the active palette as CSS custom properties on `<html>` (`--color-bg`,
  `--color-accent`, …) and `globals.css` only reads those variables, so a switch restyles the page
  without re-rendering the dashboard. The 3D viewer reads the accent and grid colors from `useTheme()`.
- The choice is saved in `localStorage` (key `theme`) and restored on the next visit.
- Keyboard: the menu opens on the active theme; ↑/↓ move, Home/End jump, Enter picks, Esc closes.

No icon or CSS library is involved: the icons are text glyphs (🎨 ▼ ▲ ✓ ✕ 🗑️) and the styles are plain CSS.

## Furniture catalog
The sidebar catalog is grouped into collapsible categories (Camas, Sillas, Mesas, …; custom categories
keep their own name). Opening a category closes the others; **Expandir todo / Contraer todo** act on all
of them. The search box filters by name in real time and opens every category with a match; ✕ or Esc
clears it.

**Units.** Catalog sizes are in **centimeters** (what the form asks for and what the backend stores);
rooms, vertices and placed furniture are in **meters**. Every conversion goes through
`src/lib/units.ts` (`cmToM`, `mToCm`); no other file multiplies or divides by 100.

## Main flows
- **Camera analysis** — `CameraCapture` takes a frame from the webcam and POSTs it as
  `multipart/form-data` (key `file`) to `/api/v1/spaces/analyze`. The returned
  `suggested_coordinates` are validated and drawn in `Scene3D`.
- **AI chat** — `ChatPanel` sends the conversation to the backend and shows the assistant's reply.
- **Layout generation** — the room shape and furniture catalog are sent to the backend, and the
  validated positions are rendered by `RenderScene`.

## Getting started

### Requirements
- Node.js 20 or newer and npm
- The FastAPI backend running locally (by default on `http://localhost:8000`)

### 1. Install dependencies
```
npm install
```

### 2. Configure the environment
Copy the example file and adjust the backend URL if it doesn't run on port 8000:
```
cp .env.example .env.local
```
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
`.env.local` is git-ignored. Restart `npm run dev` after changing it.

### 3. Run the development server
```
npm run dev        # http://localhost:3000
```
The backend must allow `http://localhost:3000` in its CORS settings. If it is not running, the UI shows a
connection alert instead of failing silently.

### Other scripts
| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run build`     | Production build                |
| `npm start`         | Serve the production build      |
| `npm run typecheck` | TypeScript check (no output)    |
| `npm test`          | Unit tests with Vitest          |

## Deploy on Vercel
1. Push this folder as its own Git repository (the repo root is this folder, so no "Root Directory" change is needed).
2. Vercel → **Add New → Project** → import the repository. Framework is auto-detected as Next.js.
3. Under **Environment Variables** add:
   - `NEXT_PUBLIC_API_URL` = your deployed backend URL, e.g. `https://your-backend.onrender.com` (https, no trailing slash)
4. Deploy. Copy the resulting URL (e.g. `https://your-app.vercel.app`) — the **backend** needs it as `FRONTEND_URL`, otherwise
   the browser will block every request with a CORS error.

If you change `NEXT_PUBLIC_API_URL` later, redeploy: it is inlined at build time.

## Camera / AR notes
- The AR scanning and "laser" measuring need **Chrome on Android over HTTPS** (Vercel gives you HTTPS). Safari on iOS
  does not expose WebXR AR to web pages, so there the app falls back to manual entry (grid editor / typed numbers).
- Camera access also works on `http://localhost` for development.
