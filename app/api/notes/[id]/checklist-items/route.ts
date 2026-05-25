import { NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse, logServerError, validationErrorResponse } from '@/lib/api-response';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/request-auth';

type ChecklistItem = {
  id: string;
  note_id: string;
  text: string;
  is_completed: boolean;
};

const createItemSchema = z.object({
  text: z.string().min(1, 'El texto es obligatorio.'),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await context.params;

    const note = await query<{ id: string }>('SELECT id FROM notes WHERE id = $1 AND user_id = $2 LIMIT 1', [
      id,
      auth.userId,
    ]);

    if (note.length === 0) {
      return errorResponse('Nota no encontrada.', 404, { code: 'NOTE_NOT_FOUND' });
    }

    const items = await query<ChecklistItem>(
      'SELECT * FROM checklist_items WHERE note_id = $1 ORDER BY id ASC',
      [id]
    );

    return NextResponse.json(items);
  } catch (error) {
    logServerError('notes/[id]/checklist-items GET', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const { id } = await context.params;

    const note = await query<{ id: string }>('SELECT id FROM notes WHERE id = $1 AND user_id = $2 LIMIT 1', [
      id,
      auth.userId,
    ]);

    if (note.length === 0) {
      return errorResponse('Nota no encontrada.', 404, { code: 'NOTE_NOT_FOUND' });
    }

    const [item] = await query<ChecklistItem>(
      'INSERT INTO checklist_items (note_id, text) VALUES ($1, $2) RETURNING *',
      [id, parsed.data.text]
    );

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    logServerError('notes/[id]/checklist-items POST', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}
