import type { Env } from './env';
import { errorResponse, preflight } from './http';

/**
 * A ~60-line router, on purpose.
 *
 * The Worker has one job: serve a small, fixed set of normalized read-only
 * routes. A framework would be more code than the thing it routes. When the
 * route table outgrows this — nested resources, middleware chains, streaming —
 * swapping in Hono is a contained change because handlers already take a
 * plain context.
 */

export interface RouteContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  params: Readonly<Record<string, string>>;
  url: URL;
}

export type RouteHandler = (context: RouteContext) => Response | Promise<Response>;

interface Route {
  method: 'GET';
  segments: string[];
  handler: RouteHandler;
}

function split(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

function match(route: Route, segments: string[]): Record<string, string> | null {
  if (route.segments.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (const [index, expected] of route.segments.entries()) {
    const actual = segments[index];
    if (actual === undefined) return null;
    if (expected.startsWith(':')) {
      params[expected.slice(1)] = decodeURIComponent(actual);
      continue;
    }
    if (expected !== actual) return null;
  }
  return params;
}

export class Router {
  private readonly routes: Route[] = [];

  get(pattern: string, handler: RouteHandler): this {
    this.routes.push({ method: 'GET', segments: split(pattern), handler });
    return this;
  }

  async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return preflight();
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse('bad_request', `Method ${request.method} is not supported.`, 405);
    }

    const url = new URL(request.url);
    const segments = split(url.pathname);

    for (const route of this.routes) {
      const params = match(route, segments);
      if (!params) continue;
      const response = await route.handler({ request, env, ctx, params, url });
      return request.method === 'HEAD'
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }

    return errorResponse('not_found', `No route for ${url.pathname}`, 404);
  }
}
