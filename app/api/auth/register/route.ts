import { NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse, logServerError, validationErrorResponse } from '@/lib/api-response';
import { hashPassword, signToken } from '@/lib/auth';
import { query } from '@/lib/db';

type CreatedUser = {
  id: string;
  email: string;
};

type ExistingUser = {
  id: string;
};

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hashPassword(parsed.data.password);

    const existingUser = await query<ExistingUser>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);

    if (existingUser.length > 0) {
      return errorResponse('El email ya esta registrado.', 409, { code: 'EMAIL_CONFLICT' });
    }

    const [user] = await query<CreatedUser>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );

    const token = signToken(user.id, user.email);

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error) {
    logServerError('auth/register POST', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}
