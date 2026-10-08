import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { doubleCsrf } from 'csrf-csrf';
import swaggerUi from 'swagger-ui-express';
import { globalLimiter } from '@middlewares/rateLimiter';

import { env } from '@config/env';
import { swaggerSpec } from '@config/swagger';
import { requestContext } from '@middlewares/requestContext';
import { requestLogger } from '@middlewares/requestLogger';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';

// Route Imports
import authRoutes from '@routes/auth.routes';
import musicRoutes from '@routes/music.routes';
import artistRoutes from '@routes/artist.routes';
import playlistRoutes from '@routes/playlist.routes';
import searchRoutes from '@routes/search.routes';
import recommendationsRoutes from '@routes/recommendation.routes';
import userRoutes from '@routes/user.routes';
import aiRoutes from '@routes/ai.routes';
import taskRoutes from '@routes/tasks.routes';
import healthRoutes from '@routes/health.routes';
import notificationRoutes from '@routes/notification.routes';
import { NotificationController } from '@controllers/notification.controller';

const app: Express = express();

// Requests arrive via Vercel's /api proxy and Render's load balancer, so the
// socket address is a proxy's. Without this every signed-out visitor shares
// one IP-keyed rate-limit bucket (10 logins / 15 min for everyone).
// ponytail: `true` takes the leftmost X-Forwarded-For, which a client calling
// Render directly can spoof to dodge IP limits; if that's abused, have Vercel
// send a shared-secret header and reject requests to Render without it.
app.set('trust proxy', true);

// Request tracing — must be first so every subsequent middleware/log line
// (including errors) has a request id available.
app.use(requestContext);

// Every response here is per-session (auth state, personalized data) —
// without an explicit Cache-Control, this API is served through Vercel's
// rewrite proxy (frontend/next.config.ts), and Vercel's edge fills in its
// own default of `public, max-age=0, must-revalidate` for any response
// that doesn't set one. That's a shared/CDN-cacheable directive, and none
// of these responses vary the cache key by cookie — so a shared cache is
// technically permitted to serve one request's body (session data,
// Set-Cookie included) to a different, unrelated request that lands on
// the same cache key. `no-store` forbids caching outright, at every layer.
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Utility Middlewares (must be before CSRF so cookies can be parsed)
app.use(compression());
// Express's 100kb default everywhere, except the two routes whose JSON body
// carries an image: a screenshot (base64, capped at ~6MB by its validator)
// and a profile update (avatar as a downscaled data URL).
const defaultJson = express.json();
const largeJson: Record<string, ReturnType<typeof express.json>> = {
  [`${env.API_PREFIX}/playlists/import/screenshot`]: express.json({ limit: '8mb' }),
  [`${env.API_PREFIX}/user/profile`]: express.json({ limit: '1mb' }),
};
app.use((req, res, next) => (largeJson[req.path] ?? defaultJson)(req, res, next));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
import { Request } from 'express';

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    // The frontend (Vercel) proxies /api/* through Next.js rewrites to
    // this backend (Render) — see frontend/next.config.ts — so from the
    // browser's perspective every request is same-origin. That keeps
    // 'strict' correct (and safer) here rather than 'none': 'none' was
    // tried first and technically worked in Chrome, but Safari's
    // Intelligent Tracking Prevention blocks third-party cookies outright
    // regardless of SameSite=None, which the proxy sidesteps entirely by
    // not making it a third-party cookie in the first place.
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: (req: Request) => req.cookies?.refreshToken || 'anonymous',
});

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    dnsPrefetchControl: { allow: false },
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    credentials: true,
  })
);
app.use(globalLimiter);
app.use(hpp());
// The scheduled new-release check: a GitHub Action holding a shared secret,
// not a browser session, so it comes before the CSRF check.
app.post(`${env.API_PREFIX}/internal/release-alerts`, NotificationController.runReleaseAlerts);
app.use(doubleCsrfProtection);

// CSRF Token Endpoint
app.get(`${env.API_PREFIX}/auth/csrf`, (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Request Logging
app.use(requestLogger);

// API Documentation
if (env.SWAGGER_ENABLED) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Base Routes
app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/music`, musicRoutes);
app.use(`${env.API_PREFIX}/artists`, artistRoutes);
app.use(`${env.API_PREFIX}/playlists`, playlistRoutes);
app.use(`${env.API_PREFIX}/search`, searchRoutes);
app.use(`${env.API_PREFIX}/recommendations`, recommendationsRoutes);
app.use(`${env.API_PREFIX}/user`, userRoutes);
app.use(`${env.API_PREFIX}/ai`, aiRoutes);
app.use(`${env.API_PREFIX}/tasks`, taskRoutes);
app.use(`${env.API_PREFIX}/notifications`, notificationRoutes);

// Health check endpoints (basic, liveness, readiness — see health.routes.ts)
app.use(`${env.API_PREFIX}/health`, healthRoutes);

// Catch 404
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;

