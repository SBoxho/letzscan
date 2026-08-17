import { createRootRoute, createRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AppShell } from './AppShell';
import { NotFound } from './NotFound';
import { HomePage } from '../features/home/HomePage';
import { NowPage } from '../features/now/NowPage';
import { PlacesPage } from '../features/places/PlacesPage';
import { PlaceProfilePage } from '../features/places/PlaceProfilePage';
import { ExplorePage } from '../features/explore/ExplorePage';
import { ComparePage } from '../features/compare/ComparePage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { StatusPage } from '../features/status/StatusPage';

export const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const nowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/now',
  component: NowPage,
});

const placesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/places',
  component: PlacesPage,
});

/**
 * The first vertical slice targets this route: an official population figure
 * for one commune, sourced end to end through the pipeline.
 */
const placeProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/places/$geoId',
  component: PlaceProfilePage,
});

/**
 * Search parameters are part of the contract of a surface: a copied URL must
 * reconstruct the same view. They are validated, not trusted.
 */
const ExploreSearch = z.object({
  indicator: z.string().optional(),
  geo: z.string().optional(),
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/explore',
  validateSearch: ExploreSearch,
  component: ExplorePage,
});

const CompareSearch = z.object({
  places: z.array(z.string()).max(4).default([]),
  indicator: z.string().optional(),
});

const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  validateSearch: CompareSearch,
  component: ComparePage,
});

const dataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/data',
  component: CatalogPage,
});

const statusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/status',
  component: StatusPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  nowRoute,
  placesRoute,
  placeProfileRoute,
  exploreRoute,
  compareRoute,
  dataRoute,
  statusRoute,
]);
