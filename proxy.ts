import { NextResponse, type NextRequest } from 'next/server';

const CORS_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization';

function getAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!configuredOrigins) {
    return [] as string[];
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsResponseHeaders(request: NextRequest) {
  const headers = new Headers();
  const requestOrigin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const allowCredentials = process.env.CORS_ALLOW_CREDENTIALS === 'true';
  const hasConfiguredOrigins = allowedOrigins.length > 0;
  const isAllowedOrigin =
    requestOrigin !== null && (!hasConfiguredOrigins || allowedOrigins.includes(requestOrigin));

  headers.set('Access-Control-Allow-Methods', CORS_METHODS);
  headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
  headers.set('Vary', 'Origin');

  if (allowCredentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (requestOrigin && isAllowedOrigin) {
    headers.set('Access-Control-Allow-Origin', requestOrigin);
    return headers;
  }

  if (!allowCredentials && !hasConfiguredOrigins) {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  return headers;
}

export function proxy(request: NextRequest) {
  const corsHeaders = getCorsResponseHeaders(request);
  const isPreflightRequest = request.method === 'OPTIONS';

  if (isPreflightRequest) {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const response = NextResponse.next();
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: '/api/:path*',
};