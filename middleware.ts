import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Allow Next.js client-side auth guard to handle session token hash exchange safely
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/trades/:path*', '/dividends/:path*', '/stocks/:path*', '/codes/:path*'],
};
