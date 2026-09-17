/**
 * Mocks @google/genai so tests never make a real network call to Gemini.
 * NOT registered globally (unlike prismaMock/supabaseMock) — import this
 * explicitly, and as the FIRST import in the file, before `../../app` or
 * `@services/ai.service` (which constructs `new GoogleGenAI()` lazily on
 * first use, but mocking must still be registered before the module graph
 * loads):
 *
 *   import '../setup/geminiMock';
 *   import request from 'supertest';
 *   import app from '../../app';
 *   import { geminiMock } from '../setup/geminiMock';
 *
 * A test configures behavior via the exported jest.fn():
 *   geminiMock.generateContent.mockResolvedValue({ text: JSON.stringify({...}) });
 */
const generateContent = jest.fn();

jest.mock('@google/genai', () => {
  return {
    __esModule: true,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: { generateContent },
    })),
    // ai.service.ts references Type.OBJECT/Type.STRING at module load time
    // to build its response schema — real enum values, not just stubs, so
    // any assertion on the schema passed to generateContent stays honest.
    Type: {
      TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
      OBJECT: 'OBJECT',
      NULL: 'NULL',
    },
  };
});

export const geminiMock = { generateContent };

beforeEach(() => {
  generateContent.mockReset();
});
