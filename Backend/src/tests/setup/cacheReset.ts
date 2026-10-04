import { clearMemoryCache } from '@utils/cache';

// withCache falls back to an in-process cache without Redis; tests reuse
// cache keys with different mocks, so each one starts cold.
beforeEach(() => clearMemoryCache());
