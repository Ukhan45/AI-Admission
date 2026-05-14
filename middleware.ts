import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TODO: Implement Firebase session verification in middleware
// For now, we rely on client-side Firebase auth checks
export async function middleware(req: NextRequest) {
  const isAuthPage =
    req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/signup') ||
    req.nextUrl.pathname.startsWith('/forgot-password') ||
    req.nextUrl.pathname.startsWith('/reset-password') ||
    req.nextUrl.pathname.startsWith('/privacy') ||
    req.nextUrl.pathname.startsWith('/terms') ||
    req.nextUrl.pathname.startsWith('/contact');

  // Allow all requests; Firebase will handle auth on client-side
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};