# Samosa Map — Handoff

Mobile-first PWA prototype for rating samosas in Lisbon's bars, cafés, tascas and bakeries.

## Stack

- Vite + React + TypeScript + Tailwind v3 + shadcn/ui (fullstack template)
- Express on port 5000 serves both the API and the built client
- SQLite (better-sqlite3) + Drizzle ORM for persistence (`data.db` in project root)
- `wouter` with `useHashLocation` for routing (paths are `#/`, `#/place/:id`, `#/auth`, `#/profile`)
- TanStack Query v5 for data fetching; all HTTP via `apiRequest` from `lib/queryClient.ts`

## What was implemented

- **Stylized prototype map** (`components/PrototypeMap.tsx`) — hand-drawn SVG of central Lisbon (Estrela, Príncipe Real, Anjos, Bairro Alto, Mouraria, Alfama, Santos, Cais do Sodré, Tagus river). Pins are HTML buttons positioned by `mapX`/`mapY` (0–100 normalized coords from seed data). Each pin shows the average rating; clicking navigates to the place detail.
- **Place list + search** filterable by name, neighbourhood, or kind.
- **Place detail page** with description, address, average rating, count, and a rating form (0–5 stars + optional note). Submitting upserts via `POST /api/ratings`.
- **Auth** — prototype: register/login return a random hex token kept in `AuthProvider` React state and a module-level variable inside `queryClient.ts` (no localStorage/cookies). Token is sent via `Authorization: Bearer <token>` on all requests.
- **Profile** lists the signed-in user's ratings with linkable cards back to each place.
- **Theme toggle** (light/dark) seeded from `prefers-color-scheme`. State lives in React only.
- **PWA basics**: `manifest.webmanifest`, `favicon.svg`, theme-color, viewport, apple-mobile-web-app meta. No service worker (intentional — keeps prototype simple).
- **Visual style**: warm spice palette (terracotta primary, turmeric accent, parchment background), Fraunces display + DM Sans body via Google Fonts, subtle dotted paper texture on the map.
- **Custom SVG logo** (`components/Logo.tsx`) — triangular samosa silhouette doubling as a map pin.
- `data-testid` attributes on every interactive element and meaningful dynamic value.

## API surface

- `POST /api/auth/register` `{username, password, displayName}` → `{token, user}`
- `POST /api/auth/login` `{username, password}` → `{token, user}`
- `POST /api/auth/logout` (Bearer token)
- `GET  /api/auth/me` → `{user|null}` (Bearer token optional)
- `GET  /api/places` → `PlaceWithStats[]` (Bearer token optional; if present, includes `myRating`)
- `GET  /api/places/:id` → `PlaceWithStats`
- `POST /api/ratings` `{placeId, score, note?}` (auth required) — upsert behaviour, unique on `(user_id, place_id)`
- `GET  /api/me/ratings` → `RatingWithPlace[]` (auth required)

## Build & test status

- `npm run build` ✅ clean (client + server bundled). Output at `dist/public/` and `dist/index.cjs`.
- `npm run check` not gated; types are sound through normal usage.
- Playwright interaction test (mobile + desktop, light + dark) passed:
  - 10 seeded places render with 10 pins.
  - Register → place page → submit rating (4) → updates count to 1 and avg to 4.0.
  - Update rating to 5 → avg recalculates to 5.0.
  - Profile page reflects 1 rating, average 5.0, and lists "Tasca do Chamiço" with the saved note.

## Key files

- `shared/schema.ts` — Drizzle schemas, Zod schemas, types (`User`, `Place`, `Rating`, `PlaceWithStats`, `RatingWithPlace`).
- `server/storage.ts` — table bootstrap, `DatabaseStorage` (uses raw `sqlite.prepare()` for joined stat queries; Drizzle for simple CRUD).
- `server/seed.ts` — 10 fictional Lisbon samosa spots with normalized map coords.
- `server/routes.ts` — auth + places + ratings; in-memory `Map<token, userId>` session store.
- `client/src/lib/queryClient.ts` — `apiRequest`, `getQueryFn` and module-level `authToken` injection.
- `client/src/lib/auth.tsx` — `AuthProvider` / `useAuth`. Calls `setAuthToken()` and invalidates the React Query cache on every auth state change.
- `client/src/components/{Logo,RatingStars,PrototypeMap,AppShell}.tsx`
- `client/src/pages/{Home,Place,Auth,Profile}.tsx`
- `client/index.html` — PWA meta, fonts (Fraunces + DM Sans + JetBrains Mono).
- `client/public/{manifest.webmanifest, favicon.svg}`
- `client/src/index.css` — warm-spice palette in `:root` + `.dark`.

## How auth/session state works (prototype)

- The client never persists anything to disk. `AuthProvider` owns `{user, token}` in React state.
- `lib/queryClient.ts` keeps a module-level `authToken` variable and exposes `setAuthToken()`. `AuthProvider` calls it whenever auth changes so every subsequent `apiRequest` and default queryFn automatically attaches `Authorization: Bearer <token>`.
- The server keeps an in-memory `Map<token, userId>`; tokens are random 24-byte hex.
- **Implications**:
  - Refreshing the page logs the user out (no persistent storage allowed in the sandbox). This is acceptable for a prototype.
  - Restarting the server invalidates all sessions — users can simply log in again; their accounts and ratings persist in `data.db`.
  - Passwords are stored unhashed in SQLite. The Auth page surfaces this in the UI copy.

## Future work / known limitations

- No service worker (offline support) — add `vite-plugin-pwa` if desired.
- Pins on mobile overlap because the map is small; consider clustering or a list-driven mobile UX.
- No image uploads for place photos.
- No password hashing — wire up `bcrypt` or `argon2` before any real launch.
- Map is illustrative; replace with MapLibre + OSM tiles for real geo data when needed (preserve `mapX`/`mapY` columns or migrate to `lat`/`lng`).

## Run

```bash
npm install
npm run dev      # development on port 5000
npm run build    # builds dist/public + dist/index.cjs
NODE_ENV=production node dist/index.cjs   # production
```
