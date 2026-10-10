/**
 * Contract index — aggregates all endpoint definitions.
 * This file NEVER changes after cp1-foundation; parts only edit their own pN.ts.
 */
import { z } from 'zod';
import { p1Endpoints } from './p1.js';
import { p2Endpoints } from './p2.js';
import { p4Endpoints } from './p4.js';

// ── Endpoint definition type ────────────────────────────────────

export interface EndpointDef<
  P = unknown,
  Q = unknown,
  B = unknown,
  R = unknown,
> {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  access: 'public' | 'auth' | 'student' | 'organizer' | 'admin' | 'organizerOrAdmin';
  part: 1 | 2 | 4;
  params?: z.ZodType<P>;
  query?: z.ZodType<Q>;
  body?: z.ZodType<B>;
  response: z.ZodType<R>;
  raw?: 'pdf' | 'ics' | 'png';
}

// ── Aggregated registry ─────────────────────────────────────────

export const CONTRACT = {
  ...p1Endpoints,
  ...p2Endpoints,
  ...p4Endpoints,
} as const;

export type ContractId = keyof typeof CONTRACT;
export type ContractEndpoint = (typeof CONTRACT)[ContractId];

/** Look up an endpoint definition by ID. */
export function getEndpoint(id: ContractId): ContractEndpoint {
  return CONTRACT[id];
}

/** Get all endpoint IDs. */
export function allEndpointIds(): ContractId[] {
  return Object.keys(CONTRACT) as ContractId[];
}

/** Get endpoints by owning part. */
export function endpointsByPart(part: 1 | 2 | 4): ContractEndpoint[] {
  return Object.values(CONTRACT).filter((e) => e.part === part);
}
