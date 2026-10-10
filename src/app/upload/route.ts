import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { r2Configured, uploadObject } from "@/lib/services/r2";
import { decodeImage, toIconWebp, toMainWebp, toScreenshotWebp } from "@/lib/services/images";

export function isUploadAuthorized(
  session: { user?: unknown } | null,
  apiKey: string | null,
): boolean {
  if (session?.user) return true;
  const expected = process.env.ADMIN_API_KEY;
  return Boolean(expected) && apiKey === expected;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const badRequest = (message: string) =>
  NextResponse.json({ ok: false, message }, { status: 400 });

function objectKey(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `uploads/${yyyy}/${mm}/${crypto.randomUUID().slice(0, 8)}.webp`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const apiKey = req.headers.get("x-admin-key");
  if (!isUploadAuthorized(session, apiKey)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!r2Configured()) {
    return NextResponse.json(
      { ok: false, message: "storage_not_configured" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("invalid_form");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("missing_file");
  if (file.size > MAX_UPLOAD_BYTES) return badRequest("file_too_large");
  if (!file.type.startsWith("image/")) return badRequest("unsupported_content_type");

  const rawKind = form.get("kind");
  const kind = rawKind == null ? "main" : rawKind;
  if (kind !== "icon" && kind !== "main" && kind !== "screenshot") {
    return badRequest("invalid_kind");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    await decodeImage(buf);
    const webp =
      kind === "icon"
        ? await toIconWebp(buf)
        : kind === "main"
          ? await toMainWebp(buf)
          : await toScreenshotWebp(buf);
    const url = await uploadObject(objectKey(), webp);
    return NextResponse.json({ ok: true, url }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid image") {
      return badRequest("invalid_image");
    }
    if (error instanceof Error && error.message === "storage not configured") {
      return NextResponse.json(
        { ok: false, message: "storage_not_configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message: "upload_failed" }, { status: 500 });
  }
}
