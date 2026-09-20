import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { doubleCsrf } from 'csrf-csrf';
import xss from 'xss-clean';
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
import healthRoutes from '@routes/health.routes';

const app: Express = express();

// Request tracing — must be first so every subsequent middleware/log line
// (including errors) has a request id available.
app.use(requestContext);

// Utility Middlewares (must be before CSRF so cookies can be parsed)
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
import { Request } from 'express';

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    // 'strict'/'lax' cookies are never sent on a request from another
    // registrable domain — fine when frontend and backend share one (dev's
    // shared localhost), but this app is deployed with the frontend on
    // Vercel and the backend on Railway, genuinely different domains.
    // 'none' is required for the browser to attach the cookie there at
    // all, and 'none' cookies must be 'secure', which is already only
    // true in production — dev keeps 'strict' since it doesn't need this
    // and 'none' without HTTPS would just get the cookie rejected outright.
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'strict',
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
app.use(xss());
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

// Health check endpoints (basic, liveness, readiness — see health.routes.ts)
app.use(`${env.API_PREFIX}/health`, healthRoutes);

// Catch 404
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;

