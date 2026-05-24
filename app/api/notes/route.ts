import { NextResponse } from 'next/server';
import { z } from 'zod';

import { query } from '@/lib/db';
import { requireAuth } from '@/lib/request-auth';

type NoteRecord = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  type: 'note' | 'checklist' | 'idea';
  color: string | null;
  created_at: string;
  updated_at: string;
};

const noteSchema = z.object({
  title: z.string().min(3, 'El titulo debe tener al menos 3 caracteres.'),
  type: z.enum(['note', 'checklist', 'idea']),
  content: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe tener formato hexadecimal #RRGGBB.')
    .optional(),
});

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const notes = await query<NoteRecord>(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [auth.userId]
    );
    return NextResponse.json(notes);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const result = noteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.issues }, { status: 400 });
    }

    const { title, type, content, color } = result.data;

    const [note] = await query<NoteRecord>(
      `INSERT INTO notes (user_id, title, type, content, color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [auth.userId, title, type, content ?? null, color ?? null]
    );

    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
