import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { env } from '@config/env';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';

const user = { id: 'user-1', supabaseId: 'supabase-user-1', email: 'user@example.com', username: 'user', isActive: true, deletedAt: null };
const authHeader = () => `Bearer ${jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!)}`;

async function subscribe(body: object) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  return agent.post('/api/notifications/subscriptions').set('x-csrf-token', csrfToken).set('Authorization', authHeader()).send(body);
}

describe('POST /api/notifications/subscriptions', () => {
  it('saves a push-service subscription for the signed-in user', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
    const res = await subscribe({ endpoint, keys: { p256dh: 'key', auth: 'secret' } });

    expect(res.status).toBe(201);
    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint },
      create: { endpoint, p256dh: 'key', auth: 'secret', userId: user.id },
      update: { p256dh: 'key', auth: 'secret', userId: user.id },
    });
  });

  it('refuses addresses that are not a push service (the server would POST to them)', async () => {
    for (const endpoint of ['http://169.254.169.254/latest/meta-data', 'https://evil.example.com/fcm.googleapis.com', 'http://fcm.googleapis.com/fcm/send/x']) {
      const res = await subscribe({ endpoint, keys: { p256dh: 'key', auth: 'secret' } });
      expect(res.status).toBe(422);
    }
    expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled();
  });
});

describe('POST /api/internal/release-alerts', () => {
  afterEach(() => {
    env.CRON_SECRET = '';
  });

  it('needs the cron secret, and is off while none is set', async () => {
    expect((await request(app).post('/api/internal/release-alerts').set('x-cron-secret', '')).status).toBe(401);
    env.CRON_SECRET = 'right-secret';
    expect((await request(app).post('/api/internal/release-alerts').set('x-cron-secret', 'wrong-secret')).status).toBe(401);
    expect((await request(app).post('/api/internal/release-alerts')).status).toBe(401);
  });

  it('runs with the right secret, without a CSRF token', async () => {
    env.CRON_SECRET = 'right-secret';
    // No VAPID keys in tests: the check itself answers that it isn't set up.
    const res = await request(app).post('/api/internal/release-alerts').set('x-cron-secret', 'right-secret');
    expect(res.status).toBe(501);
  });
});

describe('GET /api/notifications/public-key', () => {
  it('is 501 until keys are set, then gives the public key', async () => {
    expect((await request(app).get('/api/notifications/public-key')).status).toBe(501);
    env.VAPID_PUBLIC_KEY = 'BPublicKey';
    const res = await request(app).get('/api/notifications/public-key');
    env.VAPID_PUBLIC_KEY = '';
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ publicKey: 'BPublicKey' });
  });
});
