import { useEffect, useState, useCallback } from "react";
import {
  endpoints,
  ApiCategory,
  ApiMenuItem,
  ApiCampaign,
} from "./api";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function useAsync<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMenu() {
  return useAsync(() => endpoints.menu());
}

export function useCampaigns() {
  return useAsync(() => endpoints.campaigns());
}
