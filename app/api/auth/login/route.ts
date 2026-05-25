import { NextResponse } from 'next/server';
import { z } from 'zod';

import { comparePassword, signToken } from '@/lib/auth';
import { errorResponse, logServerError, validationErrorResponse } from '@/lib/api-response';
import { query } from '@/lib/db';

type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
};

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'La contrasena es obligatoria.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const email = parsed.data.email.toLowerCase();

    const [user] = await query<UserRecord>(
      'SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (!user) {
      return errorResponse('Credenciales invalidas.', 401, { code: 'INVALID_CREDENTIALS' });
    }

    if (!user.password_hash) {
      logServerError('auth/login missing password_hash', { userId: user.id });
      return errorResponse('Credenciales invalidas.', 401, { code: 'INVALID_CREDENTIALS' });
    }

    const isValidPassword = await comparePassword(parsed.data.password, user.password_hash);

    if (!isValidPassword) {
      return errorResponse('Credenciales invalidas.', 401, { code: 'INVALID_CREDENTIALS' });
    }

    const token = signToken(user.id, user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    logServerError('auth/login POST', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}
