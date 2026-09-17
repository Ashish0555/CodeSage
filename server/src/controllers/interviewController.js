import { prisma } from '../infrastructure/database/prisma.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate, startInterviewSchema, interviewMessageSchema } from '../utils/validation.js';
import { initSSE, sseSend, sseDone, sseError } from '../utils/sse.js';
import * as ai from '../services/aiService.js';

/** POST /api/interviews — create a session and stream the interviewer's opening turn. */
export const start = asyncHandler(async (req, res) => {
  const { problemSlug } = validate(startInterviewSchema, req.body);
  const problem = await prisma.problem.findUnique({ where: { slug: problemSlug } });
  if (!problem) throw new ApiError(404, 'Problem not found');

  const session = await prisma.interviewSession.create({
    data: {
      userId: req.user.id || req.user._id,
      problemId: problem.id,
      status: 'active',
    },
  });

  initSSE(res);
  try {
    sseSend(res, 'session', { sessionId: session.id });
    let full = '';
    for await (const chunk of ai.streamInterviewerTurn({ problem, messages: [] })) {
      full += chunk;
      sseSend(res, 'chunk', { text: chunk });
    }
    await prisma.interviewMessage.create({
      data: { sessionId: session.id, role: 'interviewer', content: full },
    });
    sseDone(res, { sessionId: session.id });
  } catch (err) {
    sseError(res, err.message || 'Interview failed to start');
  }
});

/**
 * POST /api/interviews/:id/message  (SSE)
 */
export const message = asyncHandler(async (req, res) => {
  const { message: text } = validate(interviewMessageSchema, req.body);
  const session = await prisma.interviewSession.findFirst({
    where: { id: req.params.id, userId: req.user.id || req.user._id },
    include: { problem: true, messages: { orderBy: { ts: 'asc' } } },
  });
  if (!session) throw new ApiError(404, 'Interview session not found');
  if (session.status === 'finished') throw new ApiError(409, 'Interview already finished');

  await prisma.interviewMessage.create({
    data: { sessionId: session.id, role: 'candidate', content: text },
  });

  initSSE(res);
  try {
    let full = '';
    const messages = session.messages.map((m) => ({ role: m.role, content: m.content }));
    for await (const chunk of ai.streamInterviewerTurn({ problem: session.problem, messages })) {
      full += chunk;
      sseSend(res, 'chunk', { text: chunk });
    }
    await prisma.interviewMessage.create({
      data: { sessionId: session.id, role: 'interviewer', content: full },
    });
    sseDone(res, {});
  } catch (err) {
    sseError(res, err.message || 'Interviewer reply failed');
  }
});

/** POST /api/interviews/:id/finish — end the session and produce a scorecard. */
export const finish = asyncHandler(async (req, res) => {
  const session = await prisma.interviewSession.findFirst({
    where: { id: req.params.id, userId: req.user.id || req.user._id },
    include: { messages: { orderBy: { ts: 'asc' } } },
  });
  if (!session) throw new ApiError(404, 'Interview session not found');

  const evaluation = await ai.evaluateInterview({ messages: session.messages });
  const updated = await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      finalEvaluation: evaluation,
      status: 'finished',
      finishedAt: new Date(),
    },
  });

  res.json({ evaluation, sessionId: updated.id });
});

/** GET /api/interviews/:id — full transcript (owner only). */
export const getSession = asyncHandler(async (req, res) => {
  const session = await prisma.interviewSession.findFirst({
    where: { id: req.params.id, userId: req.user.id || req.user._id },
    include: { problem: { select: { slug: true, title: true, difficulty: true } }, messages: { orderBy: { ts: 'asc' } } },
  });
  if (!session) throw new ApiError(404, 'Interview session not found');
  res.json({
    ...session,
    id: session.id,
    _id: session.id,
    problem: session.problem,
    messages: session.messages,
  });
});
