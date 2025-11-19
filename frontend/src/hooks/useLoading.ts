import { useState, useCallback } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface UseLoadingReturn {
  loading: LoadingState;
  isLoading: (key?: string) => boolean;
  setLoading: (key: string, value: boolean) => void;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  withLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>;
  resetLoading: () => void;
}

export function useLoading(initialState: LoadingState = {}): UseLoadingReturn {
  const [loading, setLoadingState] = useState<LoadingState>(initialState);

  const isLoading = useCallback((key?: string) => {
    if (!key) {
      return Object.values(loading).some(Boolean);
    }
    return loading[key] || false;
  }, [loading]);

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false);
  }, [setLoading]);

  const withLoading = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      startLoading(key);
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  const resetLoading = useCallback(() => {
    setLoadingState({});
  }, []);

  return {
    loading,
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
    resetLoading
  };
}

// Specific loading hooks for common operations
export function useFormLoading() {
  return useLoading({
    submit: false,
    save: false,
    delete: false,
    update: false
  });
}

export function useDataLoading() {
  return useLoading({
    fetch: false,
    create: false,
    update: false,
    delete: false,
    refresh: false
  });
}

export function usePageLoading() {
  return useLoading({
    page: false,
    navigation: false,
    auth: false
  });
}