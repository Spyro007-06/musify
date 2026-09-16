/**
 * initSentry() reads env.NODE_ENV/env.SENTRY_DSN at module-load time, so
 * each case needs a fresh module registry with its own env/logger mocks —
 * jest.doMock (not jest.mock, which hoists) lets each test set that up
 * right before requiring config/sentry.
 */
describe('initSentry', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('logs a plain info line (not a warning) when no DSN is set outside production', () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    jest.doMock('@config/env', () => ({ env: { NODE_ENV: 'development', SENTRY_DSN: undefined } }));
    jest.doMock('@utils/logger', () => ({ logger }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry } = require('@config/sentry');
    initSentry();

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('disabled'));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns loudly when booting in production without SENTRY_DSN set', () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    jest.doMock('@config/env', () => ({ env: { NODE_ENV: 'production', SENTRY_DSN: undefined } }));
    jest.doMock('@utils/logger', () => ({ logger }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry } = require('@config/sentry');
    initSentry();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SENTRY_DSN'));
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('initializes the Sentry SDK with environment and sample-rate tags when a DSN is set', () => {
    const sentryInit = jest.fn();
    const logger = { info: jest.fn(), warn: jest.fn() };
    jest.doMock('@sentry/node', () => ({ init: sentryInit, captureException: jest.fn() }));
    jest.doMock('@config/env', () => ({
      env: { NODE_ENV: 'production', SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0' },
    }));
    jest.doMock('@utils/logger', () => ({ logger }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry } = require('@config/sentry');
    initSentry();

    expect(sentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
        environment: 'production',
        tracesSampleRate: 0.1,
      })
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not sample traces in non-production even with a DSN set', () => {
    const sentryInit = jest.fn();
    jest.doMock('@sentry/node', () => ({ init: sentryInit, captureException: jest.fn() }));
    jest.doMock('@config/env', () => ({
      env: { NODE_ENV: 'development', SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0' },
    }));
    jest.doMock('@utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry } = require('@config/sentry');
    initSentry();

    expect(sentryInit).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0 }));
  });
});
