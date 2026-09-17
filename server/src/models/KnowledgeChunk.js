import mongoose from 'mongoose';

/**
 * A chunk of knowledge (editorial / concept note) for RAG.
 * `embedding` length must equal GEMINI_EMBED_DIM (default 768).
 * Kept in its OWN collection so the large vector array never bloats hot
 * Problem/Submission reads.
 *
 * For the "atlas" vector backend, create an Atlas Vector Search index named
 * per VECTOR_INDEX on the `embedding` path (cosine, numDimensions=768) with
 * `topics` and `companies` as filter fields. For the "memory" backend, no
 * index is needed — similarity is computed in Node.
 */
const knowledgeChunkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    source: String,
    title: String,
    topics: { type: [String], default: [] },
    companies: { type: [String], default: [] },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  },
  { timestamps: true }
);

export const KnowledgeChunk = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
