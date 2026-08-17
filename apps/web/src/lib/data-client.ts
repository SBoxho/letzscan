import { prettifyError, type z } from 'zod';
import { env } from './env';

/**
 * The only way the app is allowed to read remote data.
 *
 * Two rules, both enforced here rather than remembered per call site:
 *
 *  1. Every payload crossing the network boundary is validated against a
 *     canonical contract before any component sees it. An upstream shape change
 *     becomes a visible, attributable error instead of a blank panel.
 *  2. The browser talks to exactly two origins — published artifacts and the
 *     LëtzScan edge API. It never calls a provider directly, so no provider
 *     credential can ever be needed client-side.
 */

export class ContractViolationError extends Error {
  readonly url: string;
  readonly issues: string;

  constructor(url: string, issues: string) {
    super(`Response from ${url} does not match its LëtzScan contract:\n${issues}`);
    this.name = 'ContractViolationError';
    this.url = url;
    this.issues = issues;
  }
}

export class HttpError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number) {
    super(`Request to ${url} failed with HTTP ${status}`);
    this.name = 'HttpError';
    this.url = url;
    this.status = status;
  }
}

/** URL of a published static artifact (R2 / static assets). */
export function dataUrl(path: string): string {
  return `${env.dataBaseUrl}/${path.replace(/^\//, '')}`;
}

/** URL of a LëtzScan edge API route. Never a provider URL. */
export function apiUrl(path: string): string {
  return `${env.apiBaseUrl}/${path.replace(/^\//, '')}`;
}

export async function fetchContract<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { accept: 'application/json', ...init?.headers },
  });

  if (!response.ok) throw new HttpError(url, response.status);

  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ContractViolationError(url, prettifyError(parsed.error));
  }
  return parsed.data;
}
