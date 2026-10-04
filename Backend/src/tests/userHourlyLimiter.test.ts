import express from 'express';
import request from 'supertest';
import { userHourlyLimiter } from '@middlewares/rateLimiter';

describe('userHourlyLimiter', () => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { id: String(req.headers['x-user']) } as any;
    next();
  });
  app.post('/x', userHourlyLimiter('test', 2, 'Slow down.'), (_req, res) => res.json({ ok: true }));

  it('allows `max` calls per user, then 429s with a retry hint', async () => {
    await request(app).post('/x').set('x-user', 'a').expect(200);
    await request(app).post('/x').set('x-user', 'a').expect(200);
    const res = await request(app).post('/x').set('x-user', 'a').expect(429);
    expect(res.body.message).toMatch(/^Slow down\. Try again in \d+ min\.$/);
  });

  it('keeps a separate budget per user', async () => {
    await request(app).post('/x').set('x-user', 'b').expect(200);
  });
});
