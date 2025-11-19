import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Optimize edilmiş QueryClient config - performans iyileştirmeleri
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Veriler 5 dakika boyunca "fresh" kabul edilir (stale olmaz)
      staleTime: 5 * 60 * 1000, // 5 dakika
      // Cache'den silinmeden önce 10 dakika bekler
      gcTime: 10 * 60 * 1000, // 10 dakika (eski adı: cacheTime)
      // Pencere focus olduğunda otomatik refetch yapma (performans için)
      refetchOnWindowFocus: false,
      // Mount olduğunda otomatik refetch yapma (cache'den kullan)
      refetchOnMount: false,
      // Network yeniden bağlandığında refetch yapma
      refetchOnReconnect: false,
      // Retry sayısı (hata durumunda)
      retry: 1,
      // Retry delay (ms)
      retryDelay: 1000,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}