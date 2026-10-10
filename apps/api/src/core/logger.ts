import pino from 'pino';

export function createLogger(isDev: boolean) {
  return pino({
    level: isDev ? 'debug' : 'info',
    transport: isDev
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers["x-csrf-token"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.code',
        'req.body.token',
        '*.passwordHash',
        '*.usnEnc',
        '*.phoneEnc',
        '*.phone',
        '*.usn',
        '*.tokenHash',
        '*.codeHash',
      ],
      censor: '[REDACTED]',
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
