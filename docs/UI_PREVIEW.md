# Previewing the UI without any backend, database, or API keys

You asked a very reasonable question: *"Can I just check the UI for now without adding the API keys?"*

The answer is **yes** — and there are two ways to do it. This doc explains both, exactly what each one shows, how the mechanism works under the hood, and how to turn it off. It also lists a few interview-style questions you might get about this setup, since it's a genuinely good thing to be able to talk about.

---

## TL;DR

| Option | Command | Needs backend? | Needs DB? | Needs Gemini key? | What you see |
|---|---|---|---|---|---|
| **A. Mock preview** (recommended) | `cd codesage/client && npm install && npm run dev:mock` | No | No | No | Every page fully populated with realistic sample data; hints/interview "type" like the real stream |
| **B. Static frontend only** | `cd codesage/client && npm install && npm run dev` | No | No | No | The design/layout renders, but data panels error and you can't sign in (no API to call) |
| **C. Full local run** (for reference) | see [README](../README.md) | Yes | Yes | Optional | The real thing; AI shows offline fallbacks until a key is added |

The Gemini key is **optional in every case** — the app never requires it. What the pages *do* normally need is the API + database (Option C). Options A and B remove that need so you can look at the UI immediately.

---

## Option A — Mock preview mode (recommended)

This runs the **entire** React app with a built-in fake API. No `server`, no MongoDB, no keys. Every screen is populated with realistic sample data, and the streaming features (AI hints, mock-interview chat) still "type" token-by-token so the UX looks exactly like the real thing.

```bash
cd codesage/client
npm install
npm run dev:mock
```

Then open **http://localhost:5173**. A thin banner at the top reminds you the data is canned.

### What works in preview mode

- **Problems list** — all 5 seeded problems, with the search box and difficulty filter working.
- **Problem detail** — full statement, constraints, examples, editorial tab, and the **Monaco code editor** with starter code for Python / C++ / Java / JavaScript (the language switcher works).
- **Run / Submit** — returns a realistic "Accepted" result with per-test rows (visible + hidden), timings, and the verdict chip.
- **AI hint** — pick a level (1–3) and watch a tiered hint stream in.
- **AI review** — after Submit, shows complexity estimates, strengths, improvements, and edge cases.
- **Mock interview** — opens a session, streams the interviewer's opening question, responds to your messages, and produces a scorecard on "End & score".
- **Concept tutor (RAG)** — returns a grounded answer with cited sources.
- **Dashboard** — readiness gauge, solved-by-difficulty bars, acceptance rate, and recent submissions.
- **Auth** — you're auto-signed-in as a demo user so the gated pages render; the sign-in form also "works" if you visit `/auth`.

### What is *not* real in preview mode (by design)

The results are **pre-written**, not computed. Your code is **not** actually executed, the hints/reviews/interview replies are **not** from a real model, and the numbers on the dashboard are fixed sample values. Preview mode is for **looking at the UI and its states** — not for judging code or testing the AI. For that, do a full local run (Option C).

---

## Option B — Static frontend only

If you just want to glance at the design and layout with the least possible setup:

```bash
cd codesage/client
npm install
npm run dev
```

This starts Vite in normal mode. You'll see the shell, navigation, hero, typography, and the design system. **But** every page fetches from `/api/...`, and with no backend running those calls fail — so the Problems list shows an error note, the dashboard/interview routes bounce to a sign-in you can't complete, and Monaco loads but has nothing to submit against. Use Option A instead unless you specifically only want the static chrome.

---

## How preview mode works (the mechanism)

The whole thing is a small, **opt-in** interception layer. It's off unless you explicitly start with `dev:mock`, so it can never affect a real build.

### 1. The flag

Vite exposes environment variables prefixed with `VITE_` to the client bundle. Starting Vite with a mode (`vite --mode preview`) makes it load the matching dotenv file:

- **`client/.env.preview`** sets `VITE_PREVIEW=1`.
- **`client/package.json`** adds the script `"dev:mock": "vite --mode preview"` (and `build:preview` for a static hosted demo).
- **`client/src/lib/preview.js`** reads the flag: `export const PREVIEW = import.meta.env.VITE_PREVIEW === '1'`.

Plain `npm run dev` / `npm run build` don't load `.env.preview`, so `PREVIEW` is `false` and none of the mock code runs.

### 2. The fixtures + handlers — `client/src/lib/preview.js`

One self-contained module holds the sample data (the 5 problems, dashboard stats, review, tutor answer, interview scorecard) and three handlers that mirror the real API's response shapes **exactly**:

- `previewGet(path)` — handles `GET /problems`, `GET /problems/:slug`, `GET /me/stats`.
- `previewPost(path, body)` — handles `POST /run`, `/submissions`, `/ai/review/:id`, `/ai/ask`, `/interviews/:id/finish`, `/auth/*`.
- `previewStream(path, body, handlers)` — simulates Server-Sent Events for `/ai/hint`, `/interviews`, and `/interviews/:id/message`, calling `onChunk` with word-sized tokens on a timer so it "types".

Because the shapes match the controllers (`problemController`, `submissionController`, `statsController`, `aiController`, `interviewController`), the page components need **zero changes** — they can't tell the difference.

### 3. The three tiny wire-ups (each guarded by the flag)

- **`lib/api.js`** — at the top of `request()`: `if (PREVIEW) return method === 'GET' ? previewGet(path) : previewPost(path, body);` — otherwise it does the normal `fetch`.
- **`hooks/useSSE.js`** — at the top of `streamSSE()`: `if (PREVIEW) return previewStream(path, body, handlers);` — otherwise it does the normal SSE fetch/parse.
- **`context/AuthContext.jsx`** — initial `token`/`user` state is seeded with a fake user when `PREVIEW` is on, so gated routes render and action buttons (disabled when logged out) are enabled.
- **`App.jsx`** — renders a small `PreviewBanner` when `PREVIEW` is on.

That's the entire footprint. Remove the flag and the app is byte-for-byte the real client again.

### Data-flow diagram

```
                     ┌─────────────────── PREVIEW off (normal) ───────────────────┐
  React page ──▶ api.get/post ──▶ fetch('/api/...') ──▶ Vite proxy ──▶ Express ──▶ Mongo/Gemini
                     └─────────────────────────────────────────────────────────────┘

                     ┌─────────────────── PREVIEW on (dev:mock) ──────────────────┐
  React page ──▶ api.get/post ──▶ previewGet/previewPost ──▶ canned fixture (no network)
  React page ──▶ streamSSE   ──▶ previewStream ──▶ setTimeout token loop (no network)
                     └─────────────────────────────────────────────────────────────┘
```

---

## Turning it off / going live

- **Option A → real app**: stop the dev server and run the full stack from the [README](../README.md) (`server`: `npm install`, `.env` with `MONGODB_URI` + `JWT_SECRET`, `npm run seed`, `npm run dev`; then `client`: `npm run dev`). The Gemini key stays optional — without it, AI features show real "offline" fallbacks instead of canned text.
- **Delete it entirely**: remove `client/src/lib/preview.js`, `client/.env.preview`, the `dev:mock`/`build:preview` scripts, and the four small `if (PREVIEW)` guards. Nothing else depends on it.

---

## Interview angle (worth being able to explain)

Being able to demo the UI with no infra is itself a nice thing to talk about:

- **"How would you let a reviewer see the UI without setting up your whole stack?"** — An opt-in mock layer behind a build flag that intercepts the API/SSE calls and returns fixtures matching the real response contracts. Zero changes to the components, and it compiles out of the normal build.
- **"Why intercept at the `api`/`streamSSE` boundary instead of mocking `fetch`?"** — That boundary is the app's single seam for I/O. Intercepting there keeps the mock small, typed to my own contracts, and impossible to trigger accidentally in production (it's gated by `VITE_PREVIEW`).
- **"How do you keep the mock honest?"** — The fixtures are shaped from the same controllers the real API uses; if a contract changes, the preview visibly breaks in the same place the real UI would, which is a feature.
- **"Could you host this preview?"** — Yes: `npm run build:preview` produces a static bundle that runs entirely in the browser with no backend — deployable to any static host as a self-contained demo.

---

*File added by the assistant per the project instruction to document every working detail. See also [`README.md`](../README.md) and [`docs/BUILD_WALKTHROUGH.md`](BUILD_WALKTHROUGH.md).*
