# CodeSage — Setup & Deployment

Everything needed to run CodeSage from a clean clone and to deploy it. For how the system is
built, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 1. Prerequisites

- **Node.js ≥ 18** (the server sets `"engines": { "node": ">=18" }`).
- **PostgreSQL 16+** — local Postgres or a managed cloud Postgres instance.
- **(Optional) Google Gemini API key** — free from [Google AI Studio](https://aistudio.google.com/app/apikey).
  Without it the app still runs; AI features fall back gracefully.

---

## 2. Local setup

```bash
git clone https://github.com/Panku-Singla/CodeSage.git
cd CodeSage

# ---- Backend ----
cd server
npm install
cp .env.example .env          # then edit .env (see §3)
npx prisma migrate dev        # create the PostgreSQL schema
npm run seed                  # 5 problems + concept notes + demo user (+ RAG KB if a key is set)
npm run dev                   # API on http://localhost:5000   (nodemon)

# ---- Frontend (second terminal) ----
cd ../client
npm install
npm run dev                   # app on http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:5000`, so the browser talks to a single
origin (no CORS setup needed in development).

Open **http://localhost:5173** and log in with the seeded demo account:

```
email:    demo@codesage.dev
password: demo1234
```

### No-backend UI preview

To click through the entire UI with **no backend, database, or API key** — canned fixtures only:

```bash
cd client
npm run dev:mock              # vite --mode preview  (reads client/.env.preview → VITE_PREVIEW=1)
```

See [`UI_PREVIEW.md`](UI_PREVIEW.md) for what is / isn't real in preview mode.

---

## 3. Environment variables (`server/.env`)

Copy from `server/.env.example`. The app boots with just `DATABASE_URL` + `JWT_SECRET`.

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5000` | API port (hosts like Render override this automatically). |
| `NODE_ENV` | `development` | `production` in deploys. |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin — set to your deployed frontend URL. |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/codesage` | Local PostgreSQL connection string. |
| `JWT_SECRET` | *(insecure dev default)* | **Set a long random string before deploying.** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime. |
| `GEMINI_API_KEY` | *(empty)* | Optional. Empty ⇒ AI runs in fallback mode. |
| `GEMINI_TEXT_MODEL` | `gemini-2.5-flash` | Text model. |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | Embeddings model. |
| `GEMINI_EMBED_DIM` | `768` | Recommended embed dimension for the RAG flow. |
| `AI_ENABLED` | `true` | AI is on only if this is true **and** a key exists. |
| `PISTON_URL` | `https://emkc.org/api/v2/piston` | Code-execution sandbox. |
| `VECTOR_BACKEND` | `memory` | `memory` (cosine in Node, zero infra) or `atlas`-style fallback mode. |
| `VECTOR_INDEX` | `vector_index` | Reserved for vector-search setups when enabled. |

> Never commit your real `.env` — it is git-ignored. Only `.env.example` is committed.

---

## 4. Local PostgreSQL (recommended)

The simplest setup is a local Postgres instance. The project ships a Docker Compose file so you can run the database without installing Postgres by hand.

```bash
cd CodeSage
docker compose up -d postgres
```

That starts a Postgres 16 instance with a `codesage` database and the credentials from the default `.env.example`.

### Optional: pgvector

If you want a vector extension for the RAG layer, enable it in Postgres:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

When the project is deployed with a managed Postgres service, point `DATABASE_URL` at that host and run the same Prisma migration flow.

---

## 5. Deployment

The client calls `/api` **relatively**, so the goal is to make `/api/*` reach the backend. The
lowest-friction split is a backend service + a static frontend with a rewrite rule.

### 5a. Backend → Render (Node web service)

- **Root directory**: `server`
- **Build command**: `npm install`
- **Start command**: `npm start`  (`node src/index.js`)
- **Environment**: set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (your frontend URL),
  `NODE_ENV=production`, and optionally `GEMINI_API_KEY`, `VECTOR_BACKEND`, etc. Render provides
  `PORT` automatically and the config already reads `process.env.PORT`.
- **Seed once** after the first deploy: open the Render shell and run `npm run seed`.

### 5b. Frontend → Netlify or Vercel (static Vite build)

- **Base directory**: `client`
- **Build command**: `npm run build`
- **Publish directory**: `client/dist`

Add a rewrite so `/api/*` proxies to the backend and client-side routes fall back to the SPA.
**Put the API rule first.**

**Netlify** — `client/public/_redirects`:

```
/api/*   https://YOUR-BACKEND.onrender.com/api/:splat   200
/*       /index.html                                     200
```

**Vercel** — `client/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://YOUR-BACKEND.onrender.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Then set the backend's `CLIENT_URL` to the deployed frontend origin.

### 5c. Alternative: single service

Have Express serve the built client (`express.static('client/dist')` + a catch-all to
`index.html`) and deploy one service. Simplest ops, but couples the two build steps.

---

## 6. Scripts

**Server**: `npm run dev` (nodemon) · `npm start` · `npm run seed` · `npm test` (vitest).
**Client**: `npm run dev` · `npm run dev:mock` (no backend) · `npm run build` · `npm run preview`.

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `GEMINI_API_KEY not set` warning | Expected without a key — AI runs in fallback mode. Add a key and re-run `npm run seed` to enable the tutor. |
| Tutor returns nothing / KB empty | The seed skips RAG ingestion when no key is set (embeddings need the API). Add a key, re-seed. |
| 401 on `/api/...` | Missing/expired JWT — log in again; the token is kept in memory and cleared on refresh. |
| CORS error in production | Set the backend `CLIENT_URL` to the exact frontend origin, or use the `/api` rewrite (§5b) so calls are same-origin. |
| Atlas connection fails | Check the DB user/password and that your IP is allow-listed under Network Access. |
| Judge slow / rate-limited | The public Piston API is shared and rate-limited; self-host Piston/Judge0 for heavy use. |
| `npm run dev` proxy fails | Ensure the backend is running on `:5000` (the Vite proxy target). |
