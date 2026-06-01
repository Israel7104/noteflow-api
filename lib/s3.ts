import { S3Client } from '@aws-sdk/client-s3';

const requiredVariables = ['AWS_REGION', 'AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] as const;

type RequiredVariable = (typeof requiredVariables)[number];

function readRequiredEnv(name: RequiredVariable): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no esta configurada.`);
  }
  return value;
}

export function getS3Config() {
  return {
    region: readRequiredEnv('AWS_REGION'),
    bucket: readRequiredEnv('AWS_S3_BUCKET'),
    publicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, ''),
    accessKeyId: readRequiredEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: readRequiredEnv('AWS_SECRET_ACCESS_KEY'),
  };
}

export function createS3Client() {
  const config = getS3Config();

  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}
