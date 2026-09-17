import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['interviewer', 'candidate'], required: true },
    content: { type: String, required: true },
    ts: { type: Date, default: Date.now },
  },
  { _id: false }
);

const evalSchema = new mongoose.Schema(
  {
    problemSolving: Number,
    communication: Number,
    codeQuality: Number,
    overall: Number,
    notes: String,
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    status: { type: String, enum: ['active', 'finished'], default: 'active' },
    messages: { type: [messageSchema], default: [] }, // full transcript = conversation state
    finalEvaluation: { type: evalSchema, default: null },
    finishedAt: Date,
  },
  { timestamps: true }
);

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
