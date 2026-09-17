import mongoose from 'mongoose';

const exampleSchema = new mongoose.Schema(
  { input: String, output: String, explanation: String },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    statement: { type: String, required: true }, // markdown
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true, index: true },
    topics: { type: [String], default: [], index: true },
    companies: { type: [String], default: [] },
    constraints: { type: String, default: '' },
    examples: { type: [exampleSchema], default: [] },
    testCases: { type: [testCaseSchema], default: [] },
    // Map<language, starterCode> e.g. { "python": "...", "cpp": "..." }
    starterCode: { type: Map, of: String, default: () => ({}) },
    editorial: { type: String, default: '' }, // markdown; also chunked into the RAG KB
    timeLimitMs: { type: Number, default: 4000 },
  },
  { timestamps: true }
);

// Full-text index powers keyword search in GET /api/problems?search=...
problemSchema.index({ title: 'text', statement: 'text' });

export const Problem = mongoose.model('Problem', problemSchema);
