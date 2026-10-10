import sharp from "sharp";

export async function decodeImage(
  buf: Buffer,
): Promise<{ width: number; height: number; format: string }> {
  const meta = await sharp(buf)
    .metadata()
    .catch(() => null);
  if (!meta || !meta.format || !meta.width || !meta.height) {
    throw new Error("invalid image");
  }
  return { width: meta.width, height: meta.height, format: String(meta.format) };
}

export async function toIconWebp(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function toMainWebp(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize({ width: 1080, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function toScreenshotWebp(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize({ width: 1080, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
