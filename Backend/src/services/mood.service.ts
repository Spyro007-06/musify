import { prisma } from '@config/database';
import { MOODS, type Mood } from '@constants/moods';

/** A check-in steers recommendations for this long. */
const ACTIVE_FOR_MS = 3 * 60 * 60 * 1000;

const activeSince = () => new Date(Date.now() - ACTIVE_FOR_MS);

export class MoodService {
  public static async checkIn(userId: string, mood: Mood): Promise<void> {
    await prisma.moodHistory.create({ data: { userId, mood, isImplicit: false } });
  }

  /** The user's latest explicit check-in, if it's recent enough to still apply. */
  public static async getActiveMood(userId: string): Promise<Mood | null> {
    const latest = await prisma.moodHistory.findFirst({
      where: { userId, isImplicit: false, timestamp: { gte: activeSince() } },
      orderBy: { timestamp: 'desc' },
      select: { mood: true },
    });
    return latest && (MOODS as readonly string[]).includes(latest.mood) ? (latest.mood as Mood) : null;
  }

  /** Un-picks the current mood (the check-ins are withdrawn, so they don't count as signal). */
  public static async clear(userId: string): Promise<void> {
    await prisma.moodHistory.deleteMany({ where: { userId, isImplicit: false, timestamp: { gte: activeSince() } } });
  }
}
