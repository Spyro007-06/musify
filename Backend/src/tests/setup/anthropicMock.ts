/**
 * Mocks @anthropic-ai/sdk so tests never make a real network call to
 * Claude. NOT registered globally (unlike prismaMock/supabaseMock) —
 * import this explicitly, and as the FIRST import in the file, before
 * `../../app` or `@services/ai.service` (which constructs `new
 * Anthropic()` lazily on first use, but mocking must still be registered
 * before the module graph loads):
 *
 *   import '../setup/anthropicMock';
 *   import request from 'supertest';
 *   import app from '../../app';
 *   import { anthropicMock } from '../setup/anthropicMock';
 *
 * A test configures behavior via the exported jest.fn():
 *   anthropicMock.messagesCreate.mockResolvedValue({
 *     content: [{ type: 'text', text: JSON.stringify({...}) }],
 *   });
 */
const messagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: messagesCreate },
    })),
  };
});

export const anthropicMock = { messagesCreate };

beforeEach(() => {
  messagesCreate.mockReset();
});
