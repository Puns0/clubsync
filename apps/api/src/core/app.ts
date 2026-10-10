import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AppConfig } from './config.js';
import type { Logger } from './logger.js';
import type { PrismaClient } from '@prisma/client';
import type { CryptoService } from './crypto.js';
import { sessionMiddleware, csrfMiddleware } from './security.js';
import { errorHandler } from './errors.js';
import { mountRoutes } from './module.js';

export function createApp(
  config: AppConfig,
  logger: Logger,
  prisma: PrismaClient,
  crypto: CryptoService,
) {
  const app = express();
  const server = http.createServer(app);

  app.set('trust proxy', config.TRUST_PROXY ? 1 : false);
  app.disable('x-powered-by');

  // CSP: Relaxed in dev for Vite (unsafe-inline), strict in prod
  const scriptSrc = config.isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"];
  const connectSrc = config.isDev
    ? ["'self'", 'ws:', 'wss:', 'http://localhost:*', 'ws://localhost:*']
    : ["'self'", 'wss:'];

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc,
          connectSrc,
          imgSrc: ["'self'", 'data:', 'blob:'],
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind/Radix uses inline styles often
          fontSrc: ["'self'", 'data:'],
        },
      },
    }),
  );

  // In dev, Vite is on another port, so we need CORS.
  // In prod, API and Web are on the same origin via Cloudflare Tunnel or static serving.
  if (config.isDev) {
    app.use(
      cors({
        origin: config.APP_ORIGIN,
        credentials: true,
      }),
    );
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  // Request ID & Logging
  app.use((req, _res, next) => {
    req.requestId = crypto.randomToken(8);
    next();
  });

  // Global rate limit: 1000 requests per 15 minutes per IP
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  });
  app.use('/api', globalLimiter);

  // Security Middlewares
  app.use('/api', sessionMiddleware(prisma, crypto, config, logger));
  app.use('/api', csrfMiddleware(crypto, config));

  // Router for API
  const apiRouter = express.Router();
  mountRoutes(apiRouter, config);
  app.use(apiRouter); // Mount routes at the root of the router, because paths in contract include /api/

  // Serve static web dist if configured
  if (config.WEB_DIST) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, '../../..', config.WEB_DIST);
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 404 Handler for API
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found' } });
  });

  // Central Error Handler
  app.use(errorHandler(logger));

  return { app, server };
}
