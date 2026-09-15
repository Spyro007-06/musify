import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';

const owner = {
  id: 'owner-1',
  supabaseId: 'supabase-owner-1',
  email: 'owner@example.com',
  username: 'owner',
  displayName: 'Owner',
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

const intruder = { ...owner, id: 'intruder-1', supabaseId: 'supabase-intruder-1', username: 'intruder' };

function bearerFor(user: typeof owner) {
  return `Bearer ${jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!)}`;
}

async function authedPost(path: string, user: typeof owner, body: object) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any); // for the `authenticate` middleware lookup
  return agent.post(path).set('x-csrf-token', csrfToken).set('Authorization', bearerFor(user)).send(body);
}

async function authedDelete(path: string, user: typeof owner) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  return agent.delete(path).set('x-csrf-token', csrfToken).set('Authorization', bearerFor(user));
}

describe('POST /api/playlists', () => {
  it('rejects an empty body (no title, no albumId) with 422', async () => {
    prismaMock.user.findUnique.mockResolvedValue(owner as any);
    const res = await authedPost('/api/playlists', owner, {});
    expect(res.status).toBe(422);
  });

  it('creates a playlist for the authenticated owner', async () => {
    prismaMock.playlist.create.mockResolvedValue({
      id: 'playlist-1',
      title: 'My Mix',
      description: null,
      coverUrl: null,
      isPublic: true,
      ownerId: owner.id,
    } as any);

    const res = await authedPost('/api/playlists', owner, { title: 'My Mix' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('My Mix');
    expect(prismaMock.playlist.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: owner.id }) })
    );
  });

  it('rejects an unauthenticated request', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const res = await agent.post('/api/playlists').set('x-csrf-token', csrfToken).send({ title: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/playlists/:id — ownership enforcement', () => {
  it('returns 404 when the playlist does not exist', async () => {
    prismaMock.playlist.findUnique.mockResolvedValue(null);
    const res = await authedDelete('/api/playlists/does-not-exist', owner);
    expect(res.status).toBe(404);
  });

  it("returns 403 when a non-owner tries to delete someone else's playlist", async () => {
    prismaMock.playlist.findUnique.mockResolvedValue({ id: 'playlist-1', ownerId: owner.id } as any);

    const res = await authedDelete('/api/playlists/playlist-1', intruder);

    expect(res.status).toBe(403);
    expect(prismaMock.playlist.delete).not.toHaveBeenCalled();
  });

  it('allows the owner to delete their own playlist', async () => {
    prismaMock.playlist.findUnique.mockResolvedValue({ id: 'playlist-1', ownerId: owner.id } as any);
    prismaMock.playlist.delete.mockResolvedValue({ id: 'playlist-1' } as any);

    const res = await authedDelete('/api/playlists/playlist-1', owner);

    expect(res.status).toBe(200);
    expect(prismaMock.playlist.delete).toHaveBeenCalledWith({ where: { id: 'playlist-1' } });
  });
});
