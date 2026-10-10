import type { Request, Response, NextFunction, Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from './config.js';
import type { Logger } from './logger.js';
import type { Mailer } from './mail.js';
import type { AuditService } from './audit.js';
import type { SettingsService } from './settings.js';
import type { CryptoService } from './crypto.js';
import type { RealtimeHub } from './realtime.js';
import type { guards as guardFns } from './guards.js';
import type { z } from 'zod';
import { CONTRACT, type ContractId, type EndpointDef } from '@clubsync/shared';
import { AppError } from './errors.js';

// ── Module types ─────────────────────────────────────────────────

export interface ModuleContext {
  prisma: PrismaClient;
  config: AppConfig;
  log: Logger;
  mailer: Mailer;
  audit: AuditService;
  settings: SettingsService;
  crypto: CryptoService;
  realtime: RealtimeHub;
  setRealtimeHub(hub: RealtimeHub): void;
  guards: typeof guardFns;
}

export interface ApiModule {
  id: string;
  part: 1 | 2 | 3 | 4;
  register?(ctx: ModuleContext): void | Promise<void>;
  onServerReady?(server: import('http').Server, ctx: ModuleContext): void;
  jobs?: Array<{ name: string; cron: string; run(ctx: ModuleContext): Promise<void> }>;
}

export function defineModule(mod: ApiModule): ApiModule {
  return mod;
}

// ── Route definition ─────────────────────────────────────────────

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

interface RouteRegistration {
  endpointId: ContractId;
  handlers: RequestHandler[];
}

const registeredRoutes: RouteRegistration[] = [];
const implementedEndpoints = new Set<string>();

/** Register a handler for a contract endpoint. */
export function defineRoute(
  endpointId: ContractId,
  ...handlers: RequestHandler[]
): void {
  if (implementedEndpoints.has(endpointId)) {
    throw new Error(`Endpoint ${endpointId} is already registered`);
  }
  implementedEndpoints.add(endpointId);
  registeredRoutes.push({ endpointId, handlers });
}

/** Check if an endpoint has been implemented. */
export function isEndpointImplemented(id: string): boolean {
  return implementedEndpoints.has(id);
}

/** Get all implemented endpoint IDs. */
export function getImplementedEndpoints(): string[] {
  return [...implementedEndpoints];
}

// ── Module loading ───────────────────────────────────────────────

export async function loadModules(ctx: ModuleContext): Promise<ApiModule[]> {
  const modules: ApiModule[] = [];

  // Dynamic import of all module.ts files
  const moduleFiles = import.meta.glob('../modules/*/module.ts', { eager: true });

  for (const [path, mod] of Object.entries(moduleFiles)) {
    const m = (mod as { default: ApiModule }).default;
    if (!m || !m.id) {
      ctx.log.warn({ path }, 'Skipping module without id');
      continue;
    }
    modules.push(m);
  }

  // Sort by part then id
  modules.sort((a, b) => a.part - b.part || a.id.localeCompare(b.id));

  // Register each module
  for (const m of modules) {
    ctx.log.info({ module: m.id, part: m.part }, 'Registering module');
    if (m.register) {
      await m.register(ctx);
    }
  }

  return modules;
}

// ── Route mounting ───────────────────────────────────────────────

/** Access guard factory based on the endpoint's access field. */
function accessGuard(access: EndpointDef['access']): RequestHandler | null {
  switch (access) {
    case 'public':
      return null;
    case 'auth':
      return (req, _res, next) => {
        if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');
        if (req.user.disabledAt) throw new AppError('ACCOUNT_DISABLED', 'Account disabled');
        next();
      };
    case 'student':
      return (req, _res, next) => {
        if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');
        if (req.user.role !== 'STUDENT') throw new AppError('FORBIDDEN', 'Students only');
        next();
      };
    case 'organizer':
      return (req, _res, next) => {
        if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');
        if (req.user.role !== 'ORGANIZER' && req.user.role !== 'ADMIN')
          throw new AppError('FORBIDDEN', 'Organizers only');
        if (req.user.role === 'ORGANIZER' && req.user.organizerStatus !== 'APPROVED')
          throw new AppError('ORGANIZER_PENDING', 'Your organizer account is pending approval');
        next();
      };
    case 'admin':
      return (req, _res, next) => {
        if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');
        if (req.user.role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Admins only');
        next();
      };
    case 'organizerOrAdmin':
      return (req, _res, next) => {
        if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');
        if (req.user.role !== 'ORGANIZER' && req.user.role !== 'ADMIN')
          throw new AppError('FORBIDDEN', 'Organizers or admins only');
        if (req.user.role === 'ORGANIZER' && req.user.organizerStatus !== 'APPROVED')
          throw new AppError('ORGANIZER_PENDING', 'Your organizer account is pending approval');
        next();
      };
    default:
      return null;
  }
}

/** Validation middleware using the endpoint's Zod schemas. */
function validationMiddleware(endpoint: EndpointDef): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (endpoint.params) {
      req.params = (endpoint.params as z.ZodType).parse(req.params);
    }
    if (endpoint.query) {
      req.query = (endpoint.query as z.ZodType).parse(req.query);
    }
    if (endpoint.body) {
      req.body = (endpoint.body as z.ZodType).parse(req.body);
    }
    next();
  };
}

/** Mount all registered routes + 501 stubs for unimplemented endpoints. */
export function mountRoutes(router: Router, config: AppConfig): void {
  // Mount implemented routes
  for (const reg of registeredRoutes) {
    const endpoint = CONTRACT[reg.endpointId] as EndpointDef;
    const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    const middlewares: RequestHandler[] = [];

    const guard = accessGuard(endpoint.access);
    if (guard) middlewares.push(guard);
    middlewares.push(validationMiddleware(endpoint));
    middlewares.push(...reg.handlers);

    router[method](endpoint.path, ...middlewares);
  }

  // 501 stubs for unimplemented endpoints
  for (const [id, endpoint] of Object.entries(CONTRACT)) {
    if (implementedEndpoints.has(id)) continue;
    const ep = endpoint as EndpointDef;
    const method = ep.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    router[method](ep.path, (_req: Request, res: Response) => {
      res.status(501).json({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: `Endpoint ${id} is not yet implemented`,
          details: { ownerPart: ep.part },
        },
      });
    });
  }
}
