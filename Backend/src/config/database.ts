import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Singleton pattern to prevent multiple PrismaClient instances in dev (HMR)
const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat: 'pretty',
  });
};

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.info('✅ Supabase PostgreSQL connected via Prisma');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase PostgreSQL:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.info('🔌 Supabase PostgreSQL disconnected');
};
