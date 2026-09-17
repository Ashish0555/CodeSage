import { z } from 'zod';
import { ApiError } from '../middleware/error.js';

/** Parse `body` against a zod schema, throwing a 400 ApiError on failure. */
export function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, 'Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

export const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const langEnum = z.enum(['python', 'cpp', 'java', 'javascript']);

export const runSchema = z.object({
  problemSlug: z.string(),
  language: langEnum,
  code: z.string().min(1).max(50000),
});

export const submitSchema = runSchema; // same shape

export const hintSchema = z.object({
  problemSlug: z.string(),
  level: z.coerce.number().int().min(1).max(3),
  code: z.string().max(50000).optional(),
});

export const askSchema = z.object({
  question: z.string().min(3).max(1000),
  topic: z.string().optional(),
  company: z.string().optional(),
});

export const startInterviewSchema = z.object({
  problemSlug: z.string(),
});

export const interviewMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

export const ingestSchema = z.object({
  text: z.string().min(20),
  title: z.string().min(1),
  source: z.string().optional(),
  topics: z.array(z.string()).optional(),
  companies: z.array(z.string()).optional(),
});
