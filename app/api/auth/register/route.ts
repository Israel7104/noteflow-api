import { NextResponse } from 'next/server';
import { z } from 'zod';

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
      return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hashPassword(parsed.data.password);

    const existingUser = await query<ExistingUser>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'El email ya esta registrado.' }, { status: 400 });
    }

    const [user] = await query<CreatedUser>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );

    const token = signToken(user.id, user.email);

    return NextResponse.json({ user, token }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
