import request from 'supertest';
import app from '../../app';

// Behind Vercel + Render the socket is a proxy's, so rate limits must key on
// X-Forwarded-For; otherwise every signed-out visitor shares one bucket.
describe('trust proxy', () => {
  it('gives different forwarded client IPs separate rate-limit buckets', async () => {
    const hit = (ip: string) => request(app).get('/api/nope').set('X-Forwarded-For', ip);
    await hit('198.51.100.1');
    await hit('198.51.100.1');
    const repeat = await hit('198.51.100.1');
    const fresh = await hit('198.51.100.2');
    expect(Number(fresh.headers['ratelimit-remaining'])).toBe(Number(repeat.headers['ratelimit-remaining']) + 2);
  });
});
