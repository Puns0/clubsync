import { loadConfig } from './core/config.js';
import { createLogger } from './core/logger.js';
import { createPrismaClient } from './core/db.js';
import { createCryptoService } from './core/crypto.js';
import { createAuditService } from './core/audit.js';
import { createSettingsService } from './core/settings.js';
import { createMailer } from './core/mail.js';
import { createJobScheduler } from './core/jobs.js';
import { NoopRealtimeHub, type RealtimeHub } from './core/realtime.js';
import { guards } from './core/guards.js';
import { loadModules, type ModuleContext } from './core/module.js';
import { createApp } from './core/app.js';

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger(config.isDev);

  logger.info({ env: config.NODE_ENV }, 'Starting ClubSync API');

  const prisma = createPrismaClient(logger);
  const crypto = createCryptoService(config);
  const audit = createAuditService(prisma);
  const settings = createSettingsService(prisma);
  const mailer = createMailer(config, logger);
  const jobs = createJobScheduler(logger);

  let realtimeHub: RealtimeHub = new NoopRealtimeHub();

  const ctx: ModuleContext = {
    prisma,
    config,
    log: logger,
    mailer,
    audit,
    settings,
    crypto,
    realtime: realtimeHub,
    setRealtimeHub: (hub) => {
      realtimeHub = hub;
      ctx.realtime = hub; // Update the context reference
    },
    guards,
  };

  // Load and register modules
  const modules = await loadModules(ctx);

  // Create Express app
  const { app, server } = createApp(config, logger, prisma, crypto);

  // Initialize socket.io (if any module provides it) and other server-ready hooks
  for (const m of modules) {
    if (m.onServerReady) {
      m.onServerReady(server, ctx);
    }
  }

  // Register jobs from modules
  for (const m of modules) {
    if (m.jobs) {
      for (const job of m.jobs) {
        jobs.register({
          name: `${m.id}:${job.name}`,
          cron: job.cron,
          run: () => job.run(ctx),
        });
      }
    }
  }

  jobs.startAll();

  // Start server
  const port = config.PORT;
  server.listen(port, () => {
    logger.info({ port }, 'Server is listening');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    jobs.stopAll();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
