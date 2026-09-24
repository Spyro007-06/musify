import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts', '<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@jobs/(.*)$': '<rootDir>/src/jobs/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/server.ts',
    '!src/app.ts',
    // Process bootstrap only (connects, starts workers, wires signal
    // handlers) — same shape as server.ts above, exercised by actually
    // running the worker process (see Backend/README section "Testing"),
    // not meaningfully unit-testable.
    '!src/jobs/workerMain.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  setupFiles: ['<rootDir>/src/tests/setup/env.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/prismaMock.ts',
    '<rootDir>/src/tests/setup/supabaseMock.ts',
  ],
};

export default config;
