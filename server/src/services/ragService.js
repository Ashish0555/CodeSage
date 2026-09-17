import { KnowledgeChunk } from '../models/KnowledgeChunk.js';
import { getProvider } from './llmProvider.js';
import { config } from '../config/env.js';
import { normalize, topKBySimilarity } from '../utils/vector.js';

/**
 * ragService — the retrieval half of retrieval-augmented generation.
 *
 * Ingestion:  text -> chunk -> embed (RETRIEVAL_DOCUMENT) -> L2-normalize -> store
 * Retrieval:  question -> embed (RETRIEVAL_QUERY) -> top-k by cosine -> return chunks
 *
 * Two interchangeable retrieval backends behind one function (`search`):
 *   - "memory": load candidate chunks and rank in Node. Zero infra, works
 *               anywhere, O(n) — perfect for the MVP's small KB.
 *   - "atlas":  MongoDB Atlas Vector Search ($vectorSearch aggregation stage).
 *               Scales far better; needs a vector index on `embedding`.
 * Building both behind one interface is the point: swapping is a config flag.
 */

/* ----------------------------- Chunking ----------------------------- */
/**
 * Split markdown-ish text into ~chunkChars pieces with overlap, preferring to
 * break on blank lines / headings so chunks stay semantically coherent.
 */
export function chunkText(text, { chunkChars = 1200, overlap = 200 } = {}) {
  const clean = (text || '').trim();
  if (!clean) return [];
  const paras = clean.split(/\n\s*\n/);
  const chunks = [];
  let buf = '';
  for (const para of paras) {
    if ((buf + '\n\n' + para).length > chunkChars && buf) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)); // carry overlap
    }
    buf += (buf ? '\n\n' : '') + para;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

/* ----------------------------- Ingestion ----------------------------- */
/**
 * Ingest one document into the knowledge base. Returns number of chunks stored.
 * Requires an AI provider (needs the embedding model).
 */
export async function ingestDocument({ text, title, source, topics = [], companies = [], problem = null }) {
  const provider = getProvider();
  if (!provider) throw Object.assign(new Error('AI provider required for ingestion (set GEMINI_API_KEY)'), { status: 503 });

  const pieces = chunkText(text);
  const docs = [];
  for (const piece of pieces) {
    const raw = await provider.embed({ text: piece, taskType: 'RETRIEVAL_DOCUMENT' });
    docs.push({
      text: piece,
      embedding: normalize(raw), // store normalized => cosine == dot product
      title,
      source,
      topics,
      companies,
      problem,
    });
  }
  if (docs.length) await KnowledgeChunk.insertMany(docs);
  return docs.length;
}

/* ----------------------------- Retrieval ----------------------------- */
export async function search({ question, k = 5, filter = {} }) {
  const provider = getProvider();
  if (!provider) return []; // no embeddings without a provider

  const qVecRaw = await provider.embed({ text: question, taskType: 'RETRIEVAL_QUERY' });
  const qVec = normalize(qVecRaw);

  if (config.vector.backend === 'atlas') {
    return searchAtlas(qVec, k, filter);
  }
  return searchMemory(qVec, k, filter);
}

async function searchMemory(qVec, k, filter) {
  const mongoFilter = buildMongoFilter(filter);
  const candidates = await KnowledgeChunk.find(mongoFilter).lean();
  return topKBySimilarity(qVec, candidates, k).map(({ item, score }) => ({ ...item, score }));
}

async function searchAtlas(qVec, k, filter) {
  const pipeline = [
    {
      $vectorSearch: {
        index: config.vector.index,
        path: 'embedding',
        queryVector: qVec,
        numCandidates: Math.max(100, k * 20),
        limit: k,
        ...(Object.keys(filter).length ? { filter: buildMongoFilter(filter) } : {}),
      },
    },
    { $project: { text: 1, title: 1, source: 1, topics: 1, companies: 1, score: { $meta: 'vectorSearchScore' } } },
  ];
  return KnowledgeChunk.aggregate(pipeline);
}

function buildMongoFilter({ topic, company } = {}) {
  const f = {};
  if (topic) f.topics = topic;
  if (company) f.companies = company;
  return f;
}
