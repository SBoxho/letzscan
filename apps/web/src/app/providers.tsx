import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { createQueryClient } from '../lib/query-client';
import { router } from './router';

/**
 * State ownership, decided once (docs/adr/0003):
 *
 *   TanStack Router  URL state — the shareable, restorable view
 *   TanStack Query   remote state — published artifacts and edge API reads
 *   Zustand          transient client state only (hover, selection, open panels)
 *
 * Nothing fetched over the network is cached in Zustand.
 */
const queryClient = createQueryClient();

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
