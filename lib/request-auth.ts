import { NextResponse } from 'next/server';

import { getBearerToken, verifyToken } from '@/lib/auth';

export function requireAuth(request: Request): { userId: string } | { errorResponse: NextResponse } {
  const token = getBearerToken(request.headers.get('authorization'));

  if (!token) {
    return {
      errorResponse: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  const payload = verifyToken(token);

  if (!payload) {
    return {
      errorResponse: NextResponse.json({ error: 'Token invalido' }, { status: 401 }),
    };
  }

  return { userId: payload.sub };
}
