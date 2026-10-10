import { describe, it, expect, vi, afterEach } from "vitest";
import sharp from "sharp";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: authMock }));

const s3SendMock = vi.hoisted(() => vi.fn());
vi.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    send(command: unknown) {
      return s3SendMock(command);
    }
    destroy() {}
  }
  class PutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return { S3Client, PutObjectCommand };
});

import { isUploadAuthorized, POST } from "@/app/upload/route";
import { r2Configured, r2Endpoint, r2ForcePathStyle, r2PublicUrl } from "@/lib/services/r2";
import { decodeImage, toIconWebp, toMainWebp, toScreenshotWebp } from "@/lib/services/images";

afterEach(() => {
  vi.unstubAllEnvs();
});

const stubR2Minio = () => {
  vi.stubEnv("R2_ENDPOINT", "http://127.0.0.1:9000");
  vi.stubEnv("R2_FORCE_PATH_STYLE", "1");
  vi.stubEnv("R2_ACCESS_KEY_ID", "minioadmin");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "minioadmin");
  vi.stubEnv("R2_BUCKET", "qad");
  vi.stubEnv("R2_PUBLIC_URL", "http://127.0.0.1:9000/qad");
};

const makePng = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#c81e1e" } }).png().toBuffer();

const pngFile = (buf: Buffer, name = "x.png") => new File([new Uint8Array(buf)], name, { type: "image/png" });

const uploadRequest = (form: FormData, opts: { apiKey?: string } = {}) => {
  const headers: Record<string, string> = {};
  if (opts.apiKey) headers["x-admin-key"] = opts.apiKey;
  return new NextRequest("http://localhost:3000/upload", { method: "POST", body: form, headers });
};

describe("isUploadAuthorized", () => {
  it("rejects a request with no session and a wrong key", () => {
    vi.stubEnv("ADMIN_API_KEY", "secret");
    expect(isUploadAuthorized(null, "wrong")).toBe(false);
  });

  it("accepts any request with a session user", () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(isUploadAuthorized({ user: { id: 1 } }, null)).toBe(true);
  });

  it("accepts a key request when ADMIN_API_KEY is set and the key matches", () => {
    vi.stubEnv("ADMIN_API_KEY", "secret");
    expect(isUploadAuthorized(null, "secret")).toBe(true);
  });

  it("rejects a key request when ADMIN_API_KEY is unset", () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(isUploadAuthorized(null, "secret")).toBe(false);
  });
});

describe("r2 helpers", () => {
  it("r2Configured is false when nothing is set", () => {
    vi.stubEnv("R2_ENDPOINT", "");
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("R2_BUCKET", "");
    expect(r2Configured()).toBe(false);
  });

  it("r2Configured is true once the account endpoint and credentials are set", () => {
    vi.stubEnv("R2_ENDPOINT", "");
    vi.stubEnv("R2_ACCOUNT_ID", "abc123");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("R2_BUCKET", "qad");
    expect(r2Configured()).toBe(true);
  });

  it("r2Configured is false when the bucket is missing", () => {
    vi.stubEnv("R2_ENDPOINT", "http://127.0.0.1:9000");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("R2_BUCKET", "");
    expect(r2Configured()).toBe(false);
  });

  it("r2Endpoint prefers R2_ENDPOINT over the account fallback", () => {
    vi.stubEnv("R2_ENDPOINT", "http://127.0.0.1:9000");
    vi.stubEnv("R2_ACCOUNT_ID", "abc123");
    expect(r2Endpoint()).toBe("http://127.0.0.1:9000");
  });

  it("r2Endpoint falls back to the Cloudflare account endpoint", () => {
    vi.stubEnv("R2_ENDPOINT", "");
    vi.stubEnv("R2_ACCOUNT_ID", "abc123");
    expect(r2Endpoint()).toBe("https://abc123.r2.cloudflarestorage.com");
  });

  it("r2ForcePathStyle is only enabled by the value 1", () => {
    vi.stubEnv("R2_FORCE_PATH_STYLE", "");
    expect(r2ForcePathStyle()).toBe(false);
    vi.stubEnv("R2_FORCE_PATH_STYLE", "1");
    expect(r2ForcePathStyle()).toBe(true);
    vi.stubEnv("R2_FORCE_PATH_STYLE", "0");
    expect(r2ForcePathStyle()).toBe(false);
  });

  it("r2PublicUrl strips trailing slashes", () => {
    vi.stubEnv("R2_PUBLIC_URL", "https://pub-x.r2.dev/");
    expect(r2PublicUrl()).toBe("https://pub-x.r2.dev");
    vi.stubEnv("R2_PUBLIC_URL", "");
    expect(r2PublicUrl()).toBe("");
  });
});

describe("decodeImage", () => {
  it("returns dimensions and format for a decodable PNG", async () => {
    const png = await makePng(30, 20);
    expect(await decodeImage(png)).toEqual({ width: 30, height: 20, format: "png" });
  });

  it('throws "invalid image" for non-decodable input', async () => {
    await expect(decodeImage(Buffer.from("this is not an image"))).rejects.toThrow("invalid image");
  });
});

describe("sharp transforms", () => {
  it("toIconWebp produces a 512x512 webp", async () => {
    const png = await makePng(640, 400);
    const meta = await sharp(await toIconWebp(png)).metadata();
    expect(meta).toEqual(expect.objectContaining({ format: "webp", width: 512, height: 512 }));
  });

  it("toMainWebp caps very wide images at 1080w", async () => {
    const png = await makePng(2000, 1000);
    const meta = await sharp(await toMainWebp(png)).metadata();
    expect(meta).toEqual(expect.objectContaining({ format: "webp", width: 1080, height: 540 }));
  });

  it("toMainWebp leaves small images untouched", async () => {
    const png = await makePng(300, 200);
    const meta = await sharp(await toMainWebp(png)).metadata();
    expect(meta).toEqual(expect.objectContaining({ format: "webp", width: 300, height: 200 }));
  });

  it("toScreenshotWebp caps height-heavy screenshots at 1080w", async () => {
    const png = await makePng(1500, 3000);
    const meta = await sharp(await toScreenshotWebp(png)).metadata();
    expect(meta).toEqual(expect.objectContaining({ format: "webp", width: 1080, height: 2160 }));
  });
});

describe("POST /upload", () => {
  it("returns 401 with no session and no key", async () => {
    authMock.mockResolvedValue(null);
    vi.stubEnv("ADMIN_API_KEY", "");
    const res = await POST(uploadRequest(new FormData()));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false });
  });

  it("returns 401 for a wrong key", async () => {
    authMock.mockResolvedValue(null);
    vi.stubEnv("ADMIN_API_KEY", "secret");
    const res = await POST(uploadRequest(new FormData(), { apiKey: "nope" }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false });
  });

  it("returns 503 when storage is not configured", async () => {
    authMock.mockResolvedValue({ user: { id: 1 } });
    vi.stubEnv("R2_ENDPOINT", "");
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("R2_BUCKET", "");
    const form = new FormData();
    form.append("file", pngFile(await makePng(100, 60)));
    const res = await POST(uploadRequest(form, { apiKey: "ignored" }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, message: "storage_not_configured" });
  });

  it("returns 400 when the form has no file", async () => {
    authMock.mockResolvedValue({ user: { id: 1 } });
    stubR2Minio();
    const form = new FormData();
    form.append("kind", "main");
    const res = await POST(uploadRequest(form, { apiKey: "ignored" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, message: "missing_file" });
  });

  it("returns 400 for non-image content types", async () => {
    authMock.mockResolvedValue({ user: { id: 1 } });
    stubR2Minio();
    const form = new FormData();
    form.append("file", new File([Buffer.from("hello")], "x.txt", { type: "text/plain" }));
    const res = await POST(uploadRequest(form, { apiKey: "ignored" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, message: "unsupported_content_type" });
  });

  it("returns 400 for undecodable image bytes", async () => {
    authMock.mockResolvedValue({ user: { id: 1 } });
    stubR2Minio();
    const form = new FormData();
    form.append("file", pngFile(Buffer.from("garbage bytes"), "not-really.png"));
    const res = await POST(uploadRequest(form, { apiKey: "ignored" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, message: "invalid_image" });
  });

  it("returns 400 for files over the 8MB limit", async () => {
    authMock.mockResolvedValue({ user: { id: 1 } });
    stubR2Minio();
    const form = new FormData();
    form.append("file", pngFile(Buffer.alloc(8 * 1024 * 1024 + 1), "big.png"));
    const res = await POST(uploadRequest(form, { apiKey: "ignored" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, message: "file_too_large" });
  });

  it("returns 400 for an unknown kind", async () => {
    authMock.mockResolvedValue({ user: { id: 1 } });
    stubR2Minio();
    const form = new FormData();
    form.append("file", pngFile(await makePng(100, 60)));
    form.append("kind", "banner");
    const res = await POST(uploadRequest(form, { apiKey: "ignored" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, message: "invalid_kind" });
  });

  it("uploads an icon and returns the public URL", async () => {
    authMock.mockResolvedValue(null);
    vi.stubEnv("ADMIN_API_KEY", "probe-key");
    stubR2Minio();
    s3SendMock.mockResolvedValue({});
    const form = new FormData();
    form.append("file", pngFile(await makePng(700, 700)));
    form.append("kind", "icon");
    const res = await POST(uploadRequest(form, { apiKey: "probe-key" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const cmd = s3SendMock.mock.calls[0]?.[0] as {
      input: { Bucket: string; Key: string; Body: Buffer; ContentType: string };
    };
    expect(cmd).toBeTruthy();
    expect(cmd.input.Bucket).toBe("qad");
    expect(cmd.input.ContentType).toBe("image/webp");
    expect(cmd.input.Key).toMatch(/^uploads\/\d{4}\/\d{2}\/[0-9a-f]{8}\.webp$/);
    expect(body.url).toBe(`http://127.0.0.1:9000/qad/${cmd.input.Key}`);
    const meta = await sharp(cmd.input.Body).metadata();
    expect(meta).toEqual(expect.objectContaining({ format: "webp", width: 512, height: 512 }));
  });
});
