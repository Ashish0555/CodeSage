import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const topicStatSchema = new mongoose.Schema(
  { solved: { type: Number, default: 0 }, attempts: { type: Number, default: 0 } },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false => never returned by default queries; must .select('+passwordHash') to read.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    stats: {
      solved: { type: Number, default: 0 },
      attempts: { type: Number, default: 0 },
      byTopic: { type: Map, of: topicStatSchema, default: () => ({}) },
      byDifficulty: {
        easy: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        hard: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Shape safe for API responses (never leaks passwordHash).
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    stats: this.stats,
  };
};

export const User = mongoose.model('User', userSchema);
