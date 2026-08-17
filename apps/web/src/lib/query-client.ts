import { QueryClient } from '@tanstack/react-query';

/**
 * Remote state lives here, not in a store.
 *
 * Published artifacts are immutable or slow-moving, so aggressive refetching
 * buys nothing and costs requests. Per-query overrides express a source's real
 * cadence; there is deliberately no universal five-minute default.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 60_000,
      },
    },
  });
}
