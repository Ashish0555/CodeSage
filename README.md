# CodeSage — AI Interview & DSA Coach

![Stack](https://img.shields.io/badge/stack-PostgreSQL%20%2B%20SQLAlchemy-informational)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)
![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB)
![License](https://img.shields.io/badge/license-MIT-blue)

> Practice DSA against a **real code judge**, then get coached by an **AI** that explains the *why* — tiered hints that never spoil the solution, complexity-aware reviews, full mock interviews, and a RAG concept tutor that cites its sources.

A full-stack AI-powered DSA and interview coaching platform built with **React, Vite, Python, FastAPI, PostgreSQL, and SQLAlchemy**.

The signature idea is **LLM + deterministic verification**: a real code-execution judge is the source of truth for correctness; the LLM explains, critiques, and coaches. That separation keeps correctness independent from model output.

## Why this project

Most AI coding demos let the model grade submitted code. CodeSage does the opposite: a sandboxed judge (Piston) decides `AC/WA/TLE/CE/RE`, and AI is layered on top as optional coaching.

The deterministic judge remains the source of truth for correctness. The AI is used for explanation, coaching, hints, code review, interview support, and grounded concept tutoring.

## Feature tour

| Feature | What it does | Interesting engineering detail |
|---|---|---|
| **Code judge** | Run/submit Python, C++, Java, and JavaScript against visible + hidden tests | Untrusted code is executed in a sandbox through Piston; hidden tests and expected outputs never reach the client |
| **Tiered AI hints** | Level 1–3 nudges streamed token-by-token | Prompt guardrails avoid full solutions; generic hints can be cached to reduce quota usage |
| **AI code review** | Structured critique + complexity estimate | Review is anchored to the deterministic judge; complexity is explicitly treated as an estimate |
| **Mock interview** | Streaming interviewer chat + scorecard | Conversation transcript is persisted and replayed to the model |
| **Concept tutor (RAG)** | Grounded Q&A with citations | Retrieval is exposed behind one interface and can use in-memory cosine similarity or pgvector |
| **Dashboard** | Progress + explainable readiness score | Difficulty-weighted calculations keep the score interpretable |

## Tech stack

- **Frontend**: React 18 + Vite, React Router, Monaco Editor, React Markdown, hand-written CSS.
- **Backend**: Python 3.12+ + FastAPI, SQLAlchemy, Alembic, JWT authentication, rate limiting, and Server-Sent Events for streaming.
- **Database**: PostgreSQL.
- **AI**: Google Gemini through the Google GenAI Python SDK, with a provider-adapter design so the model vendor can be changed without rewriting the application layer.
- **Execution**: Piston public API for the MVP; self-hosted Judge0 remains the documented production path.

## Quick start

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 16+ (or the provided Docker Compose setup)

### 1. Backend

```bash
cd codesage/backend

python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt

cp .env.example .env
# Edit .env with your PostgreSQL and JWT settings.

python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 5000
```

### 2. Frontend

Open a second terminal:

```bash
cd codesage/client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

The backend requires a PostgreSQL connection string and JWT configuration. AI features additionally require a Gemini API key.

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codesage
JWT_SECRET=some_long_random_string

# Optional: enables AI hints, review, interviews, and RAG tutoring.
GEMINI_API_KEY=...
```

Without `GEMINI_API_KEY`, the core application can still run without Gemini-backed features; AI-dependent paths should use the application's configured fallback behavior.

## How it works

```text
React (Vite) ── /api ──▶ FastAPI
                          ├── auth (JWT)
                          ├── problems (hidden tests stripped)
                          ├── run/submit ──▶ Piston sandbox ──▶ verdict (source of truth)
                          ├── ai/* (SSE stream) ──▶ provider adapter ──▶ Gemini
                          └── ai/ask (RAG) ──▶ embed + retrieve ──▶ grounded answer

                          PostgreSQL + SQLAlchemy
                          └── users, problems, submissions, sessions, knowledge-base data
```

- **Streaming** for hints and interviews uses **Server-Sent Events**, keeping the server-to-client stream simple while allowing the frontend to send authentication headers with `fetch`.
- **RAG** stores normalized embeddings so cosine similarity can be computed efficiently. The retrieval layer can switch between an in-memory implementation for lightweight development and pgvector-backed search when configured.
- **Deterministic verification** stays separate from LLM reasoning: the judge decides whether code is correct; the model explains and coaches.

For the full technical deep dive — request flows, data models, and design decisions — see the documentation in `docs/`.

## Repository layout

```text
codesage/
├── backend/                    # Python + FastAPI backend
│   ├── app/
│   │   ├── ai/                 # Gemini/provider integration and RAG functionality
│   │   ├── services/            # Application services, including code judging
│   │   └── main.py              # FastAPI application
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Pytest tests
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── .env.example
│
├── client/                     # React + Vite frontend
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       └── lib/
│
└── docs/                       # Architecture, setup, and UI documentation
```

## Scripts

**Backend**:

```bash
python -m uvicorn app.main:app --reload
python -m pytest -q
python -m alembic upgrade head
```

**Frontend**:

```bash
npm run dev
npm run build
npm run preview
```

## Security notes

- Password hashes remain server-side and are never returned to the client.
- JWT secrets and Gemini credentials stay server-side and should be supplied through environment variables.
- Hidden test cases and expected outputs are never sent to the client.
- AI and code-execution routes are rate-limited where configured.
- Problem statements and submitted code are treated as untrusted input; prompts should not contain real personal or sensitive information.

## License

Released under the [MIT License](LICENSE) — built as a personal placement project.

## Why PostgreSQL?

CodeSage uses PostgreSQL as its primary database because the application contains strongly related entities such as users, problems, submissions, reviews, and interview sessions.

**SQLAlchemy** provides the database access layer, while **Alembic** manages schema migrations. PostgreSQL foreign keys, unique constraints, and indexes help enforce data integrity.

For the RAG tutor, **pgvector** allows embeddings to live alongside relational application data without introducing a separate vector database. An in-memory retrieval backend can still be used for lightweight local development when configured.
