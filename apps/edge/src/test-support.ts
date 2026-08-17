import type { Env } from './env';

/** A stand-in R2 bucket: enough surface to type-check, loud if actually used. */
function notImplemented(): never {
  throw new Error('R2 access is not stubbed in this test.');
}

export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    ENVIRONMENT: 'local',
    BUILD_VERSION: 'test',
    DATA: new Proxy({}, { get: notImplemented }) as unknown as R2Bucket,
    ...overrides,
  };
}

export function testExecutionContext(): ExecutionContext {
  return {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
    props: {},
  } as unknown as ExecutionContext;
}
