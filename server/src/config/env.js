import dotenv from 'dotenv';
dotenv.config();

/** Parse a boolean-ish env var with a default. */
function bool(v, def = false) {
  if (v === undefined || v === '') return def;
  return String(v).toLowerCase() === 'true';
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codesage',

  jwtSecret: process.env.JWT_SECRET || 'dev_insecure_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    textModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
    embedModel: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
    embedDim: parseInt(process.env.GEMINI_EMBED_DIM || '768', 10),
  },

  // AI is only "on" if explicitly enabled AND a key exists — lets the app boot & demo without a key.
  aiEnabled: bool(process.env.AI_ENABLED, true) && !!process.env.GEMINI_API_KEY,

  piston: {
    url: process.env.PISTON_URL || 'https://emkc.org/api/v2/piston',
  },

  vector: {
    backend: (process.env.VECTOR_BACKEND || 'memory').toLowerCase(), // 'memory' | 'atlas'
    index: process.env.VECTOR_INDEX || 'vector_index',
  },
};

// Soft validation: warn loudly but don't crash, so a demo can still boot.
if (!config.gemini.apiKey) {
  console.warn('[config] GEMINI_API_KEY not set — AI features run in degraded/fallback mode.');
}
if (config.jwtSecret === 'dev_insecure_secret_change_me') {
  console.warn('[config] JWT_SECRET not set — using an INSECURE dev secret. Set one before deploying.');
}
