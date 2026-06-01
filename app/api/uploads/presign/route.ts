import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse, logServerError, validationErrorResponse } from '@/lib/api-response';
import { getBearerToken } from '@/lib/auth';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
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
  const token = getBearerToken(request.headers.get('authorization'));
  if (!token) {
    return errorResponse('No autorizado.', 401, { code: 'UNAUTHORIZED' });
  }

  let firebaseUid: string;

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    firebaseUid = decoded.uid;
  } catch {
    return errorResponse('Token invalido.', 401, { code: 'INVALID_TOKEN' });
  }

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
    const key = buildKey(firebaseUid, purpose, finalExtension);

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
    const message = error instanceof Error ? error.message : '';

    if (/AWS_REGION|AWS_S3_BUCKET|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/.test(message)) {
      return errorResponse('Configuracion AWS incompleta en el backend.', 500, {
        code: 'S3_CONFIG_ERROR',
      });
    }

    if (/InvalidAccessKeyId|SignatureDoesNotMatch|AccessDenied|security token included in the request is invalid/i.test(message)) {
      return errorResponse('Credenciales AWS invalidas o sin permisos para S3.', 500, {
        code: 'S3_AUTH_ERROR',
      });
    }

    if (/FIREBASE_PROJECT_ID|FIREBASE_CLIENT_EMAIL|FIREBASE_PRIVATE_KEY/.test(message)) {
      return errorResponse('Configuracion de Firebase Admin incompleta en el backend.', 500, {
        code: 'FIREBASE_CONFIG_ERROR',
      });
    }

    logServerError('uploads presign POST', error);
    return errorResponse('Error interno.', 500, { code: 'INTERNAL_ERROR' });
  }
}
