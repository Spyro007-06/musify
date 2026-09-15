import request from 'supertest';
import app from '../../app';

describe('GET /api/health', () => {
  it('returns 200 with an ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
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
