/**
 * Integration tests for the background-job API surface: enqueueing (POST
 * /api/tasks/music/warm-cache, POST /api/recommendations/refresh) and
 * status lookup (GET /api/tasks/:id). Runs against the real Express app
 * with Prisma/Supabase mocked (see setup/prismaMock, setup/supabaseMock) —
 * `@jobs/queue` itself is mocked here too, so this never touches a real
 * Redis/BullMQ connection; the live end-to-end path is exercised
 * separately (see README "Testing").
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prismaMock } from '../setup/prismaMock';
import { getCsrfToken } from '../helpers/csrf';

jest.mock('@jobs/queue', () => ({
  enqueueProcessMusicMetadata: jest.fn(),
  enqueueGenerateUserRecommendations: jest.fn(),
  findJobById: jest.fn(),
}));

// Imported after the mock so the route/controller modules pick up the mocked version.
import app from '../../app';
import {
  enqueueProcessMusicMetadata,
  enqueueGenerateUserRecommendations,
  findJobById,
} from '@jobs/queue';

const enqueueMusicMock = enqueueProcessMusicMetadata as jest.Mock;
const enqueueRecsMock = enqueueGenerateUserRecommendations as jest.Mock;
const findJobMock = findJobById as jest.Mock;

const user = {
  id: 'user-1',
  supabaseId: 'supabase-user-1',
  email: 'user@example.com',
  username: 'user',
  displayName: 'User',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  isVerified: true,
  isActive: true,
  isPremium: false,
  premiumUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

async function authedPost(path: string, body: object) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  const token = jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!);
  return agent.post(path).set('x-csrf-token', csrfToken).set('Authorization', `Bearer ${token}`).send(body);
}

async function authedGet(path: string) {
  const agent = request.agent(app);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  const token = jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!);
  return agent.get(path).set('Authorization', `Bearer ${token}`);
}

describe('POST /api/tasks/music/warm-cache', () => {
  it('rejects a missing trackIds body with 422', async () => {
    const res = await authedPost('/api/tasks/music/warm-cache', {});
    expect(res.status).toBe(422);
  });

  it('rejects an empty trackIds array with 422', async () => {
    const res = await authedPost('/api/tasks/music/warm-cache', { trackIds: [] });
    expect(res.status).toBe(422);
  });

  it('enqueues the job and returns 202 with a taskId', async () => {
    enqueueMusicMock.mockResolvedValue({ taskId: 'job-abc', status: 'queued' });

    const res = await authedPost('/api/tasks/music/warm-cache', { trackIds: ['t1', 't2'] });

    expect(res.status).toBe(202);
    expect(res.body.data).toEqual({ taskId: 'job-abc', status: 'queued' });
    expect(enqueueMusicMock).toHaveBeenCalledWith(['t1', 't2']);
  });

  it('returns a 500 with no stack trace leaked when the queue is disabled', async () => {
    enqueueMusicMock.mockResolvedValue(null);

    const res = await authedPost('/api/tasks/music/warm-cache', { trackIds: ['t1'] });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts:\d+/); // no raw stack frame text
  });

  it('rejects an unauthenticated request with 401 (CSRF satisfied, so this isolates the auth check)', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const res = await agent.post('/api/tasks/music/warm-cache').set('x-csrf-token', csrfToken).send({ trackIds: ['t1'] });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/recommendations/refresh', () => {
  it('enqueues a per-user recommendation refresh and returns 202', async () => {
    enqueueRecsMock.mockResolvedValue({ taskId: 'job-xyz', status: 'queued' });

    const res = await authedPost('/api/recommendations/refresh', {});

    expect(res.status).toBe(202);
    expect(res.body.data).toEqual({ taskId: 'job-xyz', status: 'queued' });
    expect(enqueueRecsMock).toHaveBeenCalledWith(user.id);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns 404 for an unknown task id', async () => {
    findJobMock.mockResolvedValue(null);
    const res = await authedGet('/api/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('reports PENDING for a job still waiting/active', async () => {
    findJobMock.mockResolvedValue({ id: 'job-1', getState: jest.fn().mockResolvedValue('active') });
    const res = await authedGet('/api/tasks/job-1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ taskId: 'job-1', status: 'PENDING' });
  });

  it('reports SUCCESS with the result for a completed job', async () => {
    findJobMock.mockResolvedValue({
      id: 'job-1',
      returnvalue: { requested: 2, resolved: 2 },
      getState: jest.fn().mockResolvedValue('completed'),
    });
    const res = await authedGet('/api/tasks/job-1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ taskId: 'job-1', status: 'SUCCESS', result: { requested: 2, resolved: 2 } });
  });

  it('reports FAILURE with the error message for a failed job', async () => {
    findJobMock.mockResolvedValue({
      id: 'job-1',
      failedReason: 'generateUserRecommendations: user ghost does not exist.',
      getState: jest.fn().mockResolvedValue('failed'),
    });
    const res = await authedGet('/api/tasks/job-1');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FAILURE');
    expect(res.body.data.error).toBe('generateUserRecommendations: user ghost does not exist.');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/tasks/job-1');
    expect(res.status).toBe(401);
  });
});
