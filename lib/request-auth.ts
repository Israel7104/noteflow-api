import type { NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';

import { getBearerToken } from '@/lib/auth';
import { errorResponse, logServerError } from '@/lib/api-response';
import { query } from '@/lib/db';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';

type AuthenticatedUser = {
  userId: string;
  firebaseUid: string;
  email: string;
};

function resolveUserEmail(decodedToken: DecodedIdToken): string {
  return (decodedToken.email ?? `${decodedToken.uid}@firebase.local`).toLowerCase();
}

async function upsertUserByFirebaseUid(decodedToken: DecodedIdToken): Promise<{ id: string; email: string }> {
  const email = resolveUserEmail(decodedToken);

  const [user] = await query<{ id: string; email: string }>(
    `INSERT INTO users (email, firebase_uid, password_hash)
     VALUES ($1, $2, NULL)
     ON CONFLICT (firebase_uid)
     DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email`,
    [email, decodedToken.uid]
  );

  return user;
}

export async function requireAuth(
  request: Request
): Promise<AuthenticatedUser | { errorResponse: NextResponse }> {
  const token = getBearerToken(request.headers.get('authorization'));

  if (!token) {
    return {
      errorResponse: errorResponse('No autorizado.', 401, { code: 'UNAUTHORIZED' }),
    };
  }

  let decodedToken: DecodedIdToken;

  try {
    decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
  } catch {
    return {
      errorResponse: errorResponse('Token invalido.', 401, { code: 'INVALID_TOKEN' }),
    };
  }

  try {
    const user = await upsertUserByFirebaseUid(decodedToken);

    return {
      userId: user.id,
      firebaseUid: decodedToken.uid,
      email: user.email,
    };
  } catch (error) {
    logServerError('auth upsert firebase user', error);

    return {
      errorResponse: errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' }),
    };
  }
}
