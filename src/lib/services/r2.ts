import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function r2Configured(): boolean {
  return Boolean(
    (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID) &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

export function r2Endpoint(): string {
  return process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function r2ForcePathStyle(): boolean {
  return process.env.R2_FORCE_PATH_STYLE === "1";
}

export function r2PublicUrl(): string {
  return (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType = "image/webp",
): Promise<string> {
  if (!r2Configured()) {
    throw new Error("storage not configured");
  }
  const client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint(),
    forcePathStyle: r2ForcePathStyle(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  } finally {
    client.destroy();
  }
  return `${r2PublicUrl()}/${key}`;
}
