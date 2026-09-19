import json
import math
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.ai import prompts
from app.core.config import get_settings
from app.models.models import KnowledgeChunk

FALLBACK_HINTS = {1: 'Hint (offline): Re-read the constraints — their size usually reveals the intended time complexity and rules out brute force.', 2: 'Hint (offline): Ask which classic pattern fits — two pointers, sliding window, hashing, binary search, greedy, or dynamic programming.', 3: 'Hint (offline): Outline the key step in plain words first, then translate that single step into code before writing the whole solution.'}
REVIEW_SCHEMA = {'type':'object','properties': {'timeComplexity': {'type':'string'}, 'spaceComplexity': {'type':'string'}, 'codeQualityScore': {'type':'number'}, 'strengths': {'type':'array','items':{'type':'string'}}, 'improvements': {'type':'array','items':{'type':'string'}}, 'edgeCasesMissed': {'type':'array','items':{'type':'string'}}}, 'required':['timeComplexity','spaceComplexity','codeQualityScore','strengths','improvements','edgeCasesMissed']}
SCORECARD_SCHEMA = {'type':'object','properties': {k:{'type':'number'} for k in ('problemSolving','communication','codeQuality','overall')} | {'notes':{'type':'string'}}, 'required':['problemSolving','communication','codeQuality','overall','notes']}

_client = None
def provider():
    global _client
    settings = get_settings()
    if not settings.ai_enabled or not settings.gemini_api_key: return None
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client

def _text(system, prompt, temperature=0.4):
    client = provider()
    if not client: return None
    from google.genai import types
    response = client.models.generate_content(model=get_settings().gemini_text_model, contents=prompt, config=types.GenerateContentConfig(system_instruction=system, temperature=temperature, thinking_config=types.ThinkingConfig(thinking_budget=0)))
    return response.text

def _json(system, prompt, schema):
    client = provider()
    if not client: return None
    from google.genai import types
    response = client.models.generate_content(model=get_settings().gemini_text_model, contents=prompt, config=types.GenerateContentConfig(system_instruction=system, temperature=0.2, response_mime_type='application/json', response_schema=schema, thinking_config=types.ThinkingConfig(thinking_budget=0)))
    return json.loads(response.text)

def _embed(text, task):
    client = provider()
    if not client: return []
    from google.genai import types
    result = client.models.embed_content(model=get_settings().gemini_embed_model, contents=text, config=types.EmbedContentConfig(task_type=task, output_dimensionality=get_settings().gemini_embed_dim))
    return list(result.embeddings[0].values)

def _normalize(vector):
    size = math.sqrt(sum(value * value for value in vector))
    return [value / size for value in vector] if size else vector

def available(): return provider() is not None

def hint(problem, level, code=None):
    result = _text(prompts.HINT_SYSTEM, prompts.hint_user(problem, level, code))
    return result or FALLBACK_HINTS.get(level, FALLBACK_HINTS[1])

def review(problem, language, code, verdict, passed, total):
    result = _json(prompts.REVIEW_SYSTEM, prompts.review_user(problem, language, code, verdict, passed, total), REVIEW_SCHEMA)
    if not result: result = {'timeComplexity':'n/a (AI offline)','spaceComplexity':'n/a (AI offline)','codeQualityScore':5,'strengths':['All tests passed per the judge.'] if verdict == 'AC' else [],'improvements':['Enable the AI (set GEMINI_API_KEY) for a detailed review.'],'edgeCasesMissed':[],'model':'offline-fallback'}
    result['codeQualityScore'] = max(1, min(10, round(result.get('codeQualityScore', 5)))); result.update(groundedVerdict=verdict, model='gemini' if provider() else 'offline-fallback'); return result

def interview(problem, messages):
    client=provider(); prompt=prompts.interview_opening(problem) if not messages else '\n'.join(f"{m['role'].upper()}: {m['content']}" for m in messages)
    return _text(prompts.INTERVIEW_SYSTEM, prompt) or 'Interviewer (offline): Walk me through your approach and its time complexity.'

def evaluate(messages):
    result=_json(prompts.SCORECARD_SYSTEM, '\n'.join(f"{m['role'].upper()}: {m['content']}" for m in messages), SCORECARD_SCHEMA)
    return result or {'problemSolving':0,'communication':0,'codeQuality':0,'overall':0,'notes':'AI offline — no evaluation.'}

def search(db: Session, question, topic=None, company=None, k=5):
    query_vector=_normalize(_embed(question, 'RETRIEVAL_QUERY')); chunks=db.scalars(select(KnowledgeChunk)).all(); scored=[]
    for chunk in chunks:
        if topic and topic not in (chunk.topics or []): continue
        if company and company not in (chunk.companies or []): continue
        vector=chunk.embedding or []; score=sum(a*b for a,b in zip(query_vector, vector)) if query_vector and vector else 0
        scored.append((score, chunk))
    return [(chunk, score) for score, chunk in sorted(scored, key=lambda item:item[0], reverse=True)[:k]]

def answer(question, contexts):
    result=_text(prompts.RAG_SYSTEM, prompts.rag_user(question, [chunk for chunk, _ in contexts]), 0.3)
    return result or (f'AI offline. Most relevant note: "{contexts[0][0].text[:300]}..."' if contexts else 'AI offline and no matching notes found.')

def chunk_text(text, size=1200, overlap=200):
    clean=text.strip(); pieces=[]; buffer=''
    for paragraph in clean.split('\n\n'):
        if buffer and len(buffer)+len(paragraph)+2 > size: pieces.append(buffer.strip()); buffer=buffer[-overlap:]
        buffer += ('\n\n' if buffer else '') + paragraph
    if buffer.strip(): pieces.append(buffer.strip())
    return pieces

def embed_document(text): return _normalize(_embed(text, 'RETRIEVAL_DOCUMENT'))
