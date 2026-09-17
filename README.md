# CodeSage — AI Interview & DSA Coach

![Stack](https://img.shields.io/badge/stack-PostgreSQL%20%2B%20Prisma-informational)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)
![Node](https://img.shields.io/badge/Node-%E2%89%A518-339933)
![License](https://img.shields.io/badge/license-MIT-blue)

> Practice DSA against a **real code judge**, then get coached by an **AI** that explains the *why* — tiered hints that never spoil the solution, complexity-aware reviews, full mock interviews, and a RAG concept tutor that cites its sources.

A full-stack **MERN + GenAI** project. The signature idea: **LLM + deterministic verification**. A real code-execution judge is the source of truth for correctness; the LLM only explains, critiques, and coaches. That separation is the thing to talk about in interviews.

---

## Why this project

Most "AI coding" demos let the model *grade* the code, which is unreliable. CodeSage does the opposite: a sandboxed judge (Piston) decides `AC/WA/TLE/CE/RE`, and the AI is layered on top as **optional** coaching. If the AI key is missing, every AI feature degrades to a safe fallback and the core app still runs. That design — trust the deterministic system, treat the LLM as an assistant — is defensible and honest.

## Feature tour

| Feature | What it does | The interesting part |
|---|---|---|
| Code judge | Run/submit in Python, C++, Java, JS against visible + hidden tests | Untrusted code runs in a sandbox (Piston), never on our server; hidden tests + expected outputs never reach the client |
| Tiered AI hints | Level 1–3 nudges, streamed token-by-token | Guardrail in the prompt (never a full solution); generic hints are cached to save quota |
| AI code review | Structured critique + complexity **estimate** | Anchored to the judge verdict; complexity is labeled an estimate, not a proof |
| Mock interview | Streaming interviewer chat + scorecard | Transcript *is* the conversation state, persisted and replayed to the model |
| Concept tutor (RAG) | Grounded Q&A with citations | Retrieval behind one interface: in-memory cosine **or** Atlas Vector Search, chosen by a config flag |
| Dashboard | Progress + an explainable "readiness" score | Difficulty-weighted, every term defensible |

## Tech stack

- **Frontend**: React 18 + Vite, react-router, Monaco editor, react-markdown, a hand-written CSS design system (no Tailwind — distinctive + zero build fragility).
- **Backend**: Node + Express (ES Modules), PostgreSQL + Prisma, JWT auth (bcrypt), helmet, rate limiting, SSE for streaming.
- **AI**: Google Gemini via `@google/genai` (`gemini-2.5-flash` for text, `gemini-embedding-001` @768-dim for RAG), behind a **provider adapter** so the vendor is swappable.
- **Execution**: Piston public API for the MVP; self-hosted Judge0 is the documented "production" path.

---

## Quick start

**Prerequisites**: Node ≥ 18 and PostgreSQL 16+ (or the provided Docker Compose setup).

```bash
# 1) Backend
cd codesage/server
npm install
cp .env.example .env          # then edit .env (see below)
npx prisma migrate dev        # creates the Postgres schema
npm run seed                  # loads 5 problems + a demo user (+ RAG KB if a key is set)
npm run dev                   # starts the API on http://localhost:5000

# 2) Frontend (in a second terminal)
cd codesage/client
npm install
npm run dev                   # starts the app on http://localhost:5173
```

Open **http://localhost:5173** and sign in with the seeded demo account:

```
email:    demo@codesage.dev
password: demo1234
```

### Minimum `.env`

The app boots with just a PostgreSQL connection string and a JWT secret — **AI is optional**:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codesage
JWT_SECRET=some_long_random_string
# GEMINI_API_KEY=...   # add later to turn on hints/review/interview/tutor
```

Without `GEMINI_API_KEY`: problems, the judge, auth, and the dashboard all work; AI features return clear "offline" fallbacks and the seed script skips knowledge-base ingestion. Add a free key from [Google AI Studio](https://aistudio.google.com/app/apikey), re-run `npm run seed`, and the Tutor turns on.

---

## How it works (30-second mental model)

```
React (Vite)  ──/api──▶  Express
                           ├── auth (JWT + bcrypt)
                           ├── problems (hidden tests stripped)
                           ├── run/submit ──▶ Piston sandbox ──▶ verdict (source of truth)
                           ├── ai/* (SSE stream) ──▶ provider adapter ──▶ Gemini
                           │                                   └── (no key) safe fallbacks
                           └── ai/ask (RAG) ──▶ embed+retrieve (memory | pgvector) ──▶ grounded answer
                                       PostgreSQL + Prisma (users, problems, submissions, sessions, KB chunks)
```

- **Streaming** (hints, interview) uses **Server-Sent Events** — one-way server→client, simpler than WebSockets, and the client reads it with `fetch` so it can send an auth header.
- **RAG** stores L2-normalized embeddings so cosine similarity is a dot product; the `memory` backend ranks in Node (zero infra), the `atlas` backend uses `$vectorSearch`. Same interface, config-flag swap.

For the full technical deep-dive — request flows, the six data models, and the key design decisions — read **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**. To install, configure, seed, run, and deploy from a clean clone, see **[`docs/SETUP.md`](docs/SETUP.md)**. To explore the UI with zero backend or API keys, see **[`docs/UI_PREVIEW.md`](docs/UI_PREVIEW.md)**.

---

## Repository layout

```
codesage/
├── server/                 # Express API (ES Modules)
│   ├── src/
│   │   ├── config/         # env + database config
│   │   ├── infrastructure/  # Prisma client and database wiring
│   │   ├── middleware/     # auth, rate limits, error handling
│   │   ├── services/       # execService (Piston), aiService, llmProvider, ragService
│   │   ├── controllers/    # request handlers
│   │   ├── routes/         # route wiring
│   │   ├── prompts/        # versioned prompt templates
│   │   ├── utils/          # token, cache, backoff, vector math, SSE, validation
│   │   ├── seed/           # problems, concept notes, and the seed script
│   │   └── index.js        # app factory + server bootstrap
│   └── tests/              # vitest unit tests (exec normalization, vector math)
├── client/                 # React + Vite frontend
│   └── src/
│       ├── pages/          # ProblemList, ProblemDetail, Interview, Dashboard, Tutor, AuthPage
│       ├── components/      # shared UI atoms + MarkdownView
│       ├── context/        # AuthContext
│       ├── hooks/          # useSSE (fetch-based SSE parser)
│       └── lib/            # api client
└── docs/                   # ARCHITECTURE.md, SETUP.md, UI_PREVIEW.md
```

## Scripts

**Server**: `npm run dev` (nodemon), `npm start`, `npm run seed`, `npm test` (vitest).
**Client**: `npm run dev`, `npm run build`, `npm run preview`.

## Security notes

Password hashes use bcrypt and are `select:false` (never returned). JWTs/secrets stay server-side. Hidden test cases and their expected outputs are never sent to the client. AI/exec routes are rate-limited. Problem statements and user code are treated as **untrusted** input (prompt-injection defense). On the Gemini free tier prompts may be used for training, so don't put real PII in prompts.

## License

Released under the [MIT License](LICENSE) — built as a personal placement project.
