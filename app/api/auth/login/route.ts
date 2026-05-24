import { NextResponse } from 'next/server';
import { z } from 'zod';

import { comparePassword, signToken } from '@/lib/auth';
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
      return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const [user] = await query<UserRecord>(
      'SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (!user) {
      return NextResponse.json({ error: 'Credenciales invalidas.' }, { status: 401 });
    }

    const isValidPassword = await comparePassword(parsed.data.password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Credenciales invalidas.' }, { status: 401 });
    }

    const token = signToken(user.id, user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
