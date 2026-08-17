import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree';

export function buildRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

export const router = buildRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
