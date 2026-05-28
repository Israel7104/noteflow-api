import { NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse, logServerError, validationErrorResponse } from '@/lib/api-response';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/request-auth';

type NoteWithRelations = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  type: 'note' | 'checklist' | 'idea';
  color: string | null;
  created_at: string;
  updated_at: string;
  items: unknown[] | null;
  tags: string[] | null;
};

const patchNoteSchema = z
  .object({
    title: z.string().min(3).optional(),
    type: z.enum(['note', 'checklist', 'idea']).optional(),
    content: z.string().nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para actualizar.');

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await context.params;

    const [note] = await query<NoteWithRelations>(
      `SELECT
        n.*,
        COALESCE(json_agg(DISTINCT ci.*) FILTER (WHERE ci.id IS NOT NULL), '[]') AS items,
        COALESCE(json_agg(DISTINCT nt.tag) FILTER (WHERE nt.id IS NOT NULL), '[]') AS tags
      FROM notes n
      LEFT JOIN checklist_items ci ON n.id = ci.note_id
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      WHERE n.id = $1 AND n.user_id = $2
      GROUP BY n.id`,
      [id, auth.userId]
    );

    if (!note) {
      return errorResponse('Nota no encontrada.', 404, { code: 'NOTE_NOT_FOUND' });
    }

    return NextResponse.json(note);
  } catch (error) {
    logServerError('notes/[id] GET', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = patchNoteSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const { id } = await context.params;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (parsed.data.title !== undefined) {
      fields.push('title = $' + (values.length + 1));
      values.push(parsed.data.title);
    }
    if (parsed.data.type !== undefined) {
      fields.push('type = $' + (values.length + 1));
      values.push(parsed.data.type);
    }
    if (parsed.data.content !== undefined) {
      fields.push('content = $' + (values.length + 1));
      values.push(parsed.data.content);
    }
    if (parsed.data.color !== undefined) {
      fields.push('color = $' + (values.length + 1));
      values.push(parsed.data.color);
    }

    fields.push('updated_at = NOW()');

    values.push(id, auth.userId);

    const [updatedNote] = await query(
      `UPDATE notes
       SET ${fields.join(', ')}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING *`,
      values
    );

    if (!updatedNote) {
      return errorResponse('Nota no encontrada.', 404, { code: 'NOTE_NOT_FOUND' });
    }

    return NextResponse.json(updatedNote);
  } catch (error) {
    logServerError('notes/[id] PATCH', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await context.params;

    const deleted = await query<{ id: string }>(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, auth.userId]
    );

    if (deleted.length === 0) {
      return errorResponse('Nota no encontrada.', 404, { code: 'NOTE_NOT_FOUND' });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logServerError('notes/[id] DELETE', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}
