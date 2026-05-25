import { NextResponse } from 'next/server';

type ApiErrorResponse = {
  message: string;
  code?: string;
  details?: unknown;
};

type ApiErrorOptions = {
  code?: string;
  details?: unknown;
};

export function errorResponse(message: string, status: number, options: ApiErrorOptions = {}) {
  const body: ApiErrorResponse = { message };

  if (options.code) {
    body.code = options.code;
  }

  if (options.details !== undefined) {
    body.details = options.details;
  }

  return NextResponse.json(body, { status });
}

export function validationErrorResponse(details: unknown) {
  return errorResponse('Error de validacion.', 400, {
    code: 'VALIDATION_ERROR',
    details,
  });
}

export function logServerError(context: string, error: unknown) {
  console.error(`[api] ${context}`, error);
}