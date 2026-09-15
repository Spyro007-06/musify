import request from 'supertest';
import app from '../../app';
import { prismaMock } from '../setup/prismaMock';

describe('GET /api/health', () => {
  it('returns 200 with an ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/health/live', () => {
  it('always returns 200 regardless of dependency state', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/health/ready', () => {
  it('returns 200 when the database is reachable', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as any);
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks.database).toBe('ok');
  });

  it('returns 503 when the database is unreachable', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
  });
});

describe('request id tracing', () => {
  it('generates a request id and returns it on the response header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
    expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('echoes back an inbound x-request-id instead of generating a new one', async () => {
    const res = await request(app).get('/api/health').set('x-request-id', 'client-supplied-id-123');
    expect(res.headers['x-request-id']).toBe('client-supplied-id-123');
  });

  it('includes the request id in error response bodies', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist').set('x-request-id', 'trace-me');
    expect(res.body.requestId).toBe('trace-me');
  });
});

describe('unknown route', () => {
  it('returns a 404 in the standard error envelope', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, message: expect.any(String) })
    );
  });
});
