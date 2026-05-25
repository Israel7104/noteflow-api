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

const patchItemSchema = z
  .object({
    text: z.string().min(1).optional(),
    is_completed: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para actualizar.');

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = patchItemSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const { itemId } = await context.params;

    const ownerCheck = await query<{ id: string }>(
      `SELECT ci.id
       FROM checklist_items ci
       INNER JOIN notes n ON n.id = ci.note_id
       WHERE ci.id = $1 AND n.user_id = $2
       LIMIT 1`,
      [itemId, auth.userId]
    );

    if (ownerCheck.length === 0) {
      return errorResponse('Item no encontrado.', 404, { code: 'ITEM_NOT_FOUND' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (parsed.data.text !== undefined) {
      fields.push('text = $' + (values.length + 1));
      values.push(parsed.data.text);
    }

    if (parsed.data.is_completed !== undefined) {
      fields.push('is_completed = $' + (values.length + 1));
      values.push(parsed.data.is_completed);
    }

    values.push(itemId);

    const [item] = await query<ChecklistItem>(
      `UPDATE checklist_items
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return NextResponse.json(item);
  } catch (error) {
    logServerError('checklist-items/[itemId] PATCH', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { itemId } = await context.params;

    const deleted = await query<{ id: string }>(
      `DELETE FROM checklist_items ci
       USING notes n
       WHERE ci.note_id = n.id
         AND ci.id = $1
         AND n.user_id = $2
       RETURNING ci.id`,
      [itemId, auth.userId]
    );

    if (deleted.length === 0) {
      return errorResponse('Item no encontrado.', 404, { code: 'ITEM_NOT_FOUND' });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logServerError('checklist-items/[itemId] DELETE', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}
