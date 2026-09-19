import math
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.models import KnowledgeChunk

FALLBACK_HINTS = {1: 'Hint (offline): Re-read the constraints — their size usually reveals the intended time complexity and rules out brute force.', 2: 'Hint (offline): Ask which classic pattern fits — two pointers, sliding window, hashing, binary search, greedy, or dynamic programming.', 3: 'Hint (offline): Outline the key step in plain words first, then translate that single step into code before writing the whole solution.'}

def hint(level): return FALLBACK_HINTS.get(level, FALLBACK_HINTS[1])
def review(verdict): return {'timeComplexity': 'n/a (AI offline)', 'spaceComplexity': 'n/a (AI offline)', 'codeQualityScore': 5, 'strengths': ['All tests passed per the judge.'] if verdict == 'AC' else [], 'improvements': ['Enable the AI (set GEMINI_API_KEY) for a detailed review.'], 'edgeCasesMissed': [], 'groundedVerdict': verdict, 'model': 'offline-fallback'}
def interview_turn(): return 'Interviewer (offline): Walk me through your approach and its time complexity.'

def search(db: Session, question, topic=None, company=None, k=5):
    chunks = db.scalars(select(KnowledgeChunk)).all(); words = set(question.lower().split())
    scored = []
    for chunk in chunks:
        if topic and topic not in (chunk.topics or []): continue
        if company and company not in (chunk.companies or []): continue
        score = len(words & set((chunk.text or '').lower().split())) / max(1, len(words))
        scored.append((score, chunk))
    return [(chunk, score) for score, chunk in sorted(scored, key=lambda x: x[0], reverse=True)[:k]]

def answer(question, contexts):
    return f'AI offline. Most relevant note: "{contexts[0][0].text[:300]}..."' if contexts else 'AI offline and no matching notes found.'

def chunk_text(text, size=1200, overlap=200):
    clean = text.strip(); pieces = []; buffer = ''
    for paragraph in clean.split('\n\n'):
        if buffer and len(buffer) + len(paragraph) + 2 > size:
            pieces.append(buffer.strip()); buffer = buffer[-overlap:]
        buffer += ('\n\n' if buffer else '') + paragraph
    if buffer.strip(): pieces.append(buffer.strip())
    return pieces
