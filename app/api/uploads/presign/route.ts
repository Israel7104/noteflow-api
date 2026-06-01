import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse, logServerError, validationErrorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/request-auth';
import { createS3Client, getS3Config } from '@/lib/s3';

export const runtime = 'nodejs';

const inputSchema = z.object({
  purpose: z.enum(['avatar', 'restock', 'order']),
  contentType: z.string().min(3).max(120),
  extension: z
    .string()
    .regex(/^[a-zA-Z0-9]+$/, 'La extension del archivo no es valida.')
    .max(10)
    .optional(),
});

const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function resolveExtension(contentType: string, extension?: string) {
  if (extension) return extension.toLowerCase();
  return extensionByMime[contentType.toLowerCase()] ?? 'jpg';
}

function buildKey(userId: string, purpose: 'avatar' | 'restock' | 'order', extension: string) {
  const folder = purpose === 'avatar' ? 'avatars' : purpose === 'restock' ? 'restocks' : 'orders';
  return `${folder}/${userId}/${randomUUID()}.${extension}`;
}

function buildPublicUrl(region: string, bucket: string, key: string, publicBaseUrl?: string) {
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const result = inputSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error.issues);
    }

    const { purpose, contentType, extension } = result.data;

    if (!contentType.toLowerCase().startsWith('image/')) {
      return validationErrorResponse([{ message: 'Solo se permiten imagenes.', path: ['contentType'], code: 'custom' }]);
    }

    const config = getS3Config();
    const client = createS3Client();
    const finalExtension = resolveExtension(contentType, extension);
    const key = buildKey(auth.userId, purpose, finalExtension);

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const publicUrl = buildPublicUrl(config.region, config.bucket, key, config.publicBaseUrl);

    return NextResponse.json({
      signedUrl,
      publicUrl,
      key,
      expiresIn: 300,
    });
  } catch (error) {
    logServerError('uploads presign POST', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}
