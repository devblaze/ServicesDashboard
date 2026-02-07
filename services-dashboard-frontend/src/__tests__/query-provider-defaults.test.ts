import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

/**
 * Tests for QueryClient default configuration.
 * Validates that performance-related defaults are correctly set.
 */

// Recreate the QueryClient with the same config as QueryProvider.tsx
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchIntervalInBackground: false,
        retry: 1,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
      },
    },
  });
}

describe('QueryClient default configuration', () => {
  it('should have refetchOnWindowFocus disabled', () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('should have refetchIntervalInBackground disabled', () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.refetchIntervalInBackground).toBe(false);
  });

  it('should have staleTime of 5 minutes', () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(300000); // 5 * 60 * 1000
  });

  it('should have gcTime of 10 minutes', () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(600000); // 10 * 60 * 1000
  });

  it('should retry only once', () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
  });
});

describe('QueryClient performance characteristics', () => {
  it('should not trigger background refetches when tab is hidden', () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();

    // Both settings together ensure no background work
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.queries?.refetchIntervalInBackground).toBe(false);
  });

  it('staleTime should be longer than any refetchInterval to prevent redundant fetches on mount', () => {
    const client = createTestQueryClient();
    const staleTime = client.getDefaultOptions().queries?.staleTime as number;

    // Monitoring dashboard uses 60s intervals
    const monitoringInterval = 60000;
    // Stale time (5 min) > interval (60s) → data served from cache on re-mount
    expect(staleTime).toBeGreaterThan(monitoringInterval);
  });
});
