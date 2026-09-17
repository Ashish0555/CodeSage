import mongoose from 'mongoose';

/**
 * The AI's structured review of a submission.
 * `groundedVerdict` is COPIED from the deterministic judge — the LLM never
 * decides correctness, it only explains/critiques. `timeComplexity` /
 * `spaceComplexity` are model ESTIMATES surfaced to the user as heuristics.
 */
const aiReviewSchema = new mongoose.Schema(
  {
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    model: String,
    timeComplexity: String,
    spaceComplexity: String,
    codeQualityScore: { type: Number, min: 1, max: 10 },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    edgeCasesMissed: { type: [String], default: [] },
    groundedVerdict: String, // source of truth, from the judge
    raw: mongoose.Schema.Types.Mixed, // raw model payload for debugging
  },
  { timestamps: true }
);

export const AIReview = mongoose.model('AIReview', aiReviewSchema);
