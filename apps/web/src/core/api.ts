import { CONTRACT, type ContractId, type ContractEndpoint } from '@clubsync/shared';
import { z } from 'zod';

let csrfToken = '';

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** 
 * Build an API path by replacing :params and appending ?queries 
 */
function buildPath(
  pathTemplate: string, 
  params?: Record<string, any>, 
  query?: Record<string, any>
): string {
  let path = pathTemplate;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }
  if (query) {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        q.append(key, String(value));
      }
    }
    const qStr = q.toString();
    if (qStr) {
      path += `?${qStr}`;
    }
  }
  return path;
}

export interface ApiCallParams<T extends ContractId> {
  params?: z.infer<Exclude<ContractEndpoint['params'], undefined>>;
  query?: z.infer<Exclude<ContractEndpoint['query'], undefined>>;
  body?: z.infer<Exclude<ContractEndpoint['body'], undefined>>;
}

class ApiClient {
  async call<T extends ContractId>(
    id: T,
    args: (typeof CONTRACT)[T] extends { params: any } 
            ? (typeof CONTRACT)[T] extends { body: any } ? { params: z.infer<(typeof CONTRACT)[T]['params']>, body: z.infer<(typeof CONTRACT)[T]['body']> }
            : { params: z.infer<(typeof CONTRACT)[T]['params']> }
          : (typeof CONTRACT)[T] extends { body: any } ? { body: z.infer<(typeof CONTRACT)[T]['body']> }
          : any // Simplify for now, a fully typed extractor can be complex
  ): Promise<z.infer<(typeof CONTRACT)[T]['response']>> {
    const endpoint = CONTRACT[id] as ContractEndpoint;
    const path = buildPath(endpoint.path, (args as any)?.params, (args as any)?.query);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)) {
      headers['x-csrf-token'] = csrfToken;
    }

    const res = await fetch(path, {
      method: endpoint.method,
      headers,
      body: (args as any)?.body ? JSON.stringify((args as any).body) : undefined,
    });

    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch (e) {
        throw new ApiClientError('INTERNAL', `HTTP ${res.status} ${res.statusText}`);
      }
      throw new ApiClientError(
        errBody.error?.code || 'INTERNAL',
        errBody.error?.message || 'Unknown error',
        errBody.error?.details
      );
    }

    // Pass-through raw text (PDF/ICS) if requested, else JSON
    if (endpoint.raw) {
      return res.text() as any;
    }

    return res.json();
  }
}

export const api = new ApiClient();
