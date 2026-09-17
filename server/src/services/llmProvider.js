import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/env.js';
import { withBackoff } from '../utils/backoff.js';

/**
 * LLM provider abstraction.
 *
 * The rest of the app talks to this interface, NOT to Gemini directly:
 *   { name, generateText, generateJSON, streamText, embed }
 * Swapping to OpenAI / a local model = writing one more provider here and
 * changing getProvider(). This decoupling is a deliberate, interview-worthy
 * design choice ("how would you swap the model vendor?").
 *
 * All calls go through withBackoff() so free-tier 429s are retried politely.
 * `thinkingBudget: 0` disables the 2.5 models' extra "thinking" tokens to keep
 * latency and quota usage low for these short tasks.
 */

let _provider = null;

export function getProvider() {
  if (_provider) return _provider;
  if (!config.gemini.apiKey) return null;
  _provider = createGeminiProvider();
  return _provider;
}

function createGeminiProvider() {
  const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  const model = config.gemini.textModel;

  return {
    name: 'gemini',

    async generateText({ system, prompt, temperature = 0.4 }) {
      const res = await withBackoff(() =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction: system, temperature, thinkingConfig: { thinkingBudget: 0 } },
        })
      );
      return res.text;
    },

    async generateJSON({ system, prompt, schema, temperature = 0.2 }) {
      const res = await withBackoff(() =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            temperature,
            responseMimeType: 'application/json',
            responseSchema: schema,
            thinkingConfig: { thinkingBudget: 0 },
          },
        })
      );
      // With responseSchema the model is constrained to valid JSON.
      return JSON.parse(res.text);
    },

    async *streamText({ system, prompt, contents, temperature = 0.4 }) {
      const stream = await withBackoff(() =>
        ai.models.generateContentStream({
          model,
          contents: contents || prompt,
          config: { systemInstruction: system, temperature, thinkingConfig: { thinkingBudget: 0 } },
        })
      );
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
      }
    },

    async embed({ text, taskType = 'RETRIEVAL_DOCUMENT' }) {
      const res = await withBackoff(() =>
        ai.models.embedContent({
          model: config.gemini.embedModel,
          contents: text,
          config: { outputDimensionality: config.gemini.embedDim, taskType },
        })
      );
      return res.embeddings[0].values; // number[]
    },
  };
}

// JSON schemas for structured outputs (Gemini constrains generation to these).
export const REVIEW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    timeComplexity: { type: Type.STRING },
    spaceComplexity: { type: Type.STRING },
    codeQualityScore: { type: Type.NUMBER },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
    edgeCasesMissed: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['timeComplexity', 'spaceComplexity', 'codeQualityScore', 'strengths', 'improvements', 'edgeCasesMissed'],
};

export const SCORECARD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    problemSolving: { type: Type.NUMBER },
    communication: { type: Type.NUMBER },
    codeQuality: { type: Type.NUMBER },
    overall: { type: Type.NUMBER },
    notes: { type: Type.STRING },
  },
  required: ['problemSolving', 'communication', 'codeQuality', 'overall', 'notes'],
};
