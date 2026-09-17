import { Problem } from '../models/Problem.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate, startInterviewSchema, interviewMessageSchema } from '../utils/validation.js';
import { initSSE, sseSend, sseDone, sseError } from '../utils/sse.js';
import * as ai from '../services/aiService.js';

/** POST /api/interviews — create a session and stream the interviewer's opening turn. */
export const start = asyncHandler(async (req, res) => {
  const { problemSlug } = validate(startInterviewSchema, req.body);
  const problem = await Problem.findOne({ slug: problemSlug });
  if (!problem) throw new ApiError(404, 'Problem not found');

  const session = await InterviewSession.create({ user: req.user._id, problem: problem._id, messages: [] });

  initSSE(res);
  try {
    // send the session id first so the client can address follow-ups
    sseSend(res, 'session', { sessionId: session._id });
    let full = '';
    for await (const chunk of ai.streamInterviewerTurn({ problem, messages: [] })) {
      full += chunk;
      sseSend(res, 'chunk', { text: chunk });
    }
    session.messages.push({ role: 'interviewer', content: full });
    await session.save();
    sseDone(res, { sessionId: session._id });
  } catch (err) {
    sseError(res, err.message || 'Interview failed to start');
  }
});

/**
 * POST /api/interviews/:id/message  (SSE)
 * Append the candidate's message, then stream the interviewer's reply.
 * Conversation state = the persisted messages array.
 */
export const message = asyncHandler(async (req, res) => {
  const { message: text } = validate(interviewMessageSchema, req.body);
  const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id }).populate('problem');
  if (!session) throw new ApiError(404, 'Interview session not found');
  if (session.status === 'finished') throw new ApiError(409, 'Interview already finished');

  session.messages.push({ role: 'candidate', content: text });
  await session.save();

  initSSE(res);
  try {
    let full = '';
    for await (const chunk of ai.streamInterviewerTurn({ problem: session.problem, messages: session.messages })) {
      full += chunk;
      sseSend(res, 'chunk', { text: chunk });
    }
    session.messages.push({ role: 'interviewer', content: full });
    await session.save();
    sseDone(res, {});
  } catch (err) {
    sseError(res, err.message || 'Interviewer reply failed');
  }
});

/** POST /api/interviews/:id/finish — end the session and produce a scorecard. */
export const finish = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) throw new ApiError(404, 'Interview session not found');

  const evaluation = await ai.evaluateInterview({ messages: session.messages });
  session.finalEvaluation = evaluation;
  session.status = 'finished';
  session.finishedAt = new Date();
  await session.save();

  res.json({ evaluation, sessionId: session._id });
});

/** GET /api/interviews/:id — full transcript (owner only). */
export const getSession = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id })
    .populate('problem', 'slug title difficulty')
    .lean();
  if (!session) throw new ApiError(404, 'Interview session not found');
  res.json(session);
});
