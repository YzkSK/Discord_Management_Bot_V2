"use client";

import { useEffect, useState } from "react";

export function useDashboardData<T>(
  fetcher: () => Promise<T>,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  deps: ReadonlyArray<unknown>,
  fallbackMessage = "Failed to load data"
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher().then(
      (result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      },
      (e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : fallbackMessage);
          setData(null);
          setLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
    // deps is intentionally dynamic — callers are responsible for stability
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}
