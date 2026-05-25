import type { NextResponse } from 'next/server';

import { getBearerToken, verifyToken } from '@/lib/auth';
import { errorResponse } from '@/lib/api-response';

export function requireAuth(request: Request): { userId: string } | { errorResponse: NextResponse } {
  const token = getBearerToken(request.headers.get('authorization'));

  if (!token) {
    return {
      errorResponse: errorResponse('No autorizado.', 401, { code: 'UNAUTHORIZED' }),
    };
  }

  const payload = verifyToken(token);

  if (!payload) {
    return {
      errorResponse: errorResponse('Token invalido.', 401, { code: 'INVALID_TOKEN' }),
    };
  }

  return { userId: payload.sub };
}
