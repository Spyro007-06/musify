import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Musify Music Streaming API',
      version: '1.0.0',
      description:
        'Production-ready REST API for the Musify music streaming platform. Supports authentication, music catalog, playlists, artists, search, uploads, and subscriptions.',
      contact: {
        name: 'Musify API Support',
        email: 'api@vibe.music',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `${env.APP_URL}${env.API_PREFIX}`,
        description: 'Current server',
      },
      {
        url: 'http://localhost:3001/api',
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Music', description: 'Tracks, albums, trending & recommendations' },
      { name: 'Artists', description: 'Artist profiles & follow system' },
      { name: 'Playlists', description: 'User playlist management' },
      { name: 'Search', description: 'Full-text search & suggestions' },
      { name: 'Uploads', description: 'Media file uploads' },
      { name: 'Subscriptions', description: 'Premium plans & billing' },
      { name: 'Admin', description: 'Admin-only management endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/docs/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);

