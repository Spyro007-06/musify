/**
 * Deep-mocked PrismaClient, following Prisma's own recommended Jest setup:
 * https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing
 *
 * Registered as a global `setupFilesAfterEnv` entry so `@config/database` is
 * mocked for every test file, and mocks are reset between individual tests.
 * A test that needs specific Prisma behavior imports `prismaMock` and stubs
 * whichever call it cares about, e.g.:
 *   prismaMock.user.findUnique.mockResolvedValue(fakeUser);
 */
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, type DeepMockProxy } from 'jest-mock-extended';

jest.mock('@config/database', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

const { prisma } = require('@config/database');

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});
