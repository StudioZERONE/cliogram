import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Protect all routes except index ('/'), static files, and APIs
  const protectedRoutes = ['/dashboard', '/trades', '/dividends', '/stocks', '/codes'];
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));

  if (isProtectedRoute) {
    // Check Supabase auth cookie or auth session token
    const hasAuthCookie = req.cookies.getAll().some(
      (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    );

    // If no auth cookie found, immediately redirect to index page ('/')
    if (!hasAuthCookie) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/trades/:path*', '/dividends/:path*', '/stocks/:path*', '/codes/:path*'],
};
