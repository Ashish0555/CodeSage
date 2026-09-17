import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema(
  {
    index: Number,
    passed: Boolean,
    timeMs: Number,
    isHidden: Boolean,
    stderr: { type: String, default: '' },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    // AC=Accepted, WA=Wrong Answer, TLE=Time Limit, CE=Compile Error, RE=Runtime Error
    verdict: { type: String, enum: ['AC', 'WA', 'TLE', 'CE', 'RE'], required: true },
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    runtimeMs: { type: Number, default: 0 },
    testResults: { type: [testResultSchema], default: [] },
  },
  { timestamps: true }
);

// Compound index for the hot query: a user's submissions to a problem, newest first.
submissionSchema.index({ user: 1, problem: 1, createdAt: -1 });

export const Submission = mongoose.model('Submission', submissionSchema);
