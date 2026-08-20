'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CountsContextType {
  tradesCount: number;
  dividendsCount: number;
  stocksCount: number;
  refreshCounts: () => Promise<void>;
}

const CountsContext = createContext<CountsContextType>({
  tradesCount: 0,
  dividendsCount: 0,
  stocksCount: 0,
  refreshCounts: async () => {}
});

export function CountsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<{
    tradesCount: number;
    dividendsCount: number;
    stocksCount: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cliogram_counts');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return { tradesCount: 0, dividendsCount: 0, stocksCount: 0 };
  });

  const refreshCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCounts({ tradesCount: 0, dividendsCount: 0, stocksCount: 0 });
        return;
      }

      // Explicitly filter counts by user_id
      const [tRes, dRes, sRes] = await Promise.all([
        supabase.from('trades').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('dividends').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      const newCounts = {
        tradesCount: tRes.count ?? 0,
        dividendsCount: dRes.count ?? 0,
        stocksCount: sRes.count ?? 0
      };

      setCounts(newCounts);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cliogram_counts', JSON.stringify(newCounts));
      }
    } catch (e) {
      console.error('Error fetching counts:', e);
    }
  };

  useEffect(() => {
    refreshCounts();
  }, []);

  return (
    <CountsContext.Provider value={{ ...counts, refreshCounts }}>
      {children}
    </CountsContext.Provider>
  );
}

export function useCounts() {
  return useContext(CountsContext);
}
