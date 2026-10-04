import request from 'supertest';
import app from '../../app';

// Both requests lack a CSRF token: a body the parser accepts reaches the CSRF
// check (403); one over the route's limit is rejected first (413).
const json = (bytes: number) => JSON.stringify({ data: 'a'.repeat(bytes) });

describe('JSON body size limits', () => {
  it('rejects bodies over 100kb on ordinary routes with 413', async () => {
    const res = await request(app).post('/api/playlists').set('Content-Type', 'application/json').send(json(200_000));
    expect(res.status).toBe(413);
    expect(res.body.message).toBe('Request body is too large.');
  });

  it('accepts multi-MB bodies on the screenshot route', async () => {
    const res = await request(app)
      .post('/api/playlists/import/screenshot')
      .set('Content-Type', 'application/json')
      .send(json(3_000_000));
    expect(res.status).toBe(403);
  });

  it('answers malformed JSON with 400, not 500', async () => {
    const res = await request(app).post('/api/playlists').set('Content-Type', 'application/json').send('{"a":');
    expect(res.status).toBe(400);
  });
});
