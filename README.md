# Frontend — Vercel

Next.js app (pages router). Talks to the backend only through `NEXT_PUBLIC_API_URL`.

## Deploy on Vercel
1. Push this folder as its own Git repository (the repo root is this folder, so no "Root Directory" change is needed).
2. Vercel → **Add New → Project** → import the repository. Framework is auto-detected as Next.js.
3. Under **Environment Variables** add:
   - `NEXT_PUBLIC_API_URL` = your deployed backend URL, e.g. `https://your-backend.onrender.com` (https, no trailing slash)
4. Deploy. Copy the resulting URL (e.g. `https://your-app.vercel.app`) — the **backend** needs it as `FRONTEND_URL`, otherwise
   the browser will block every request with a CORS error.

If you change `NEXT_PUBLIC_API_URL` later, redeploy: it is inlined at build time.

## Run locally
```
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000  (backend expected on http://localhost:4000)
```
Other scripts: `npm test`, `npm run typecheck`, `npm run build`.

## Camera / AR notes
- The AR scanning and "laser" measuring need **Chrome on Android over HTTPS** (Vercel gives you HTTPS). Safari on iOS
  does not expose WebXR AR to web pages, so there the app falls back to manual entry (grid editor / typed numbers).
- Camera access also works on `http://localhost` for development.
