'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { CountsProvider } from '@/components/CountsProvider';
import { ToastProvider } from '@/components/ToastProvider';

// Suppress React 19 development warning for next-themes internal script tag injection
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>
        <CountsProvider>{children}</CountsProvider>
      </ToastProvider>
    </NextThemesProvider>
  );
}
