import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no layout engine, so the router's scroll restoration would log a
// "not implemented" warning on every navigation.
vi.stubGlobal('scrollTo', vi.fn());

afterEach(() => {
  cleanup();
});
