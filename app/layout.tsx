import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CLIOGRAM',
  description: '개인자산 관리 서비스',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CLIOGRAM',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#057a5d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  var origErr = console.error;
                  console.error = function() {
                    if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].indexOf('Encountered a script tag') !== -1) return;
                    origErr.apply(console, arguments);
                  };
                  window.addEventListener('error', function(e) {
                    if (e.message && e.message.indexOf('Encountered a script tag') !== -1) {
                      e.stopImmediatePropagation();
                      e.preventDefault();
                    }
                  }, true);
                }
              })();
            `,
          }}
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full font-sans antialiased`}
        style={{ background: 'var(--bg)', color: 'var(--fg)' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
