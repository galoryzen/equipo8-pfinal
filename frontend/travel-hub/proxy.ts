import { NextRequest, NextResponse } from 'next/server';

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const ROUTES = [
  { prefix: '/traveler', role: 'traveler', login: '/login/traveler', home: '/traveler/search' },
  { prefix: '/manager',  role: 'manager',  login: '/login/manager',  home: '/manager'         },
] as const;

function redirect(to: string, request: NextRequest) {
  return NextResponse.redirect(new URL(to, request.url));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session')?.value ?? null;
  const role = token ? getRoleFromToken(token) : null;

  if (pathname === '/') {
    const route = ROUTES.find((r) => r.role === role);
    return redirect(route?.home ?? '/login/traveler', request);
  }

  const match = ROUTES.find((r) => pathname.startsWith(r.prefix));
  if (match && role !== match.role) {
    return redirect(match.login, request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
