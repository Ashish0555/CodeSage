import { asyncHandler } from '../middleware/error.js';
import { validate, ingestSchema } from '../utils/validation.js';
import * as rag from '../services/ragService.js';

/**
 * POST /api/admin/kb/ingest — (admin only) add a document to the RAG knowledge
 * base. Chunks, embeds, and stores it. In a real product this would be a
 * background job; for the MVP it's a synchronous admin action.
 */
export const ingest = asyncHandler(async (req, res) => {
  const body = validate(ingestSchema, req.body);
  const count = await rag.ingestDocument({
    text: body.text,
    title: body.title,
    source: body.source || body.title,
    topics: body.topics || [],
    companies: body.companies || [],
  });
  res.status(201).json({ ingestedChunks: count });
});
