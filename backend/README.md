# CodeSage Python backend

FastAPI migration of the original Express API. It keeps the `/api` URLs and JSON/SSE contracts used by the existing React client.

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/codesage
uvicorn app.main:app --reload --port 5000
```

Set `JWT_SECRET`, `GEMINI_API_KEY`, `CLIENT_URL`, and `PISTON_URL` through the environment. Without a Gemini key, AI features use the same safe offline fallbacks as the previous backend. Database schema changes should be generated with Alembic against the existing PostgreSQL database.

The legacy `server/` directory is retained as a migration reference until the Python deployment is switched over; only `backend/` should be started after migration.
