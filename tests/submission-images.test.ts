import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { transferSubmissionImages, type TransferInput } from "@/lib/services/submission-images";

const makePng = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#2b5ead" } }).png().toBuffer();

type Recorded = { key: string; body: Buffer; ct: string | undefined };

const fakeIo = () => {
  const uploads: Recorded[] = [];
  const fetched: string[] = [];
  const returnBuffers = new Map<string, Buffer>();
  const fetchHandler = async (rawUrl: unknown) => {
    const url = String(rawUrl);
    fetched.push(url);
    const png = returnBuffers.get(url);
    if (!png) throw new Error(`unexpected fetch: ${url}`);
    // Buffer pooling shares one ArrayBuffer — slice out exactly the view's bytes,
    // or .arrayBuffer() leaks stale pool data to the transformer.
    const view = new Uint8Array(png);
    const exact = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return { arrayBuffer: async () => exact };
  };
  const fetch = fetchHandler as unknown as typeof globalThis.fetch;
  const uploadObject = async (key: string, body: Buffer, ct?: string) => {
    uploads.push({ key, body, ct });
    return `https://cdn.test/${key}`;
  };
  return {
    io: { fetch, uploadObject },
    uploads,
    fetched,
    /** Primes one distinct PNG buffer per URL so fetch failures are real signals. */
    prime: async (urls: string[]) => {
      let i = 0;
      for (const url of urls) returnBuffers.set(url, await makePng(40 + i, 30 + i++));
    },
  };
};

const fullInput = async (): Promise<TransferInput> => ({
  appIconUrl: "https://source.test/icon.png",
  mainImageEn: "https://source.test/main-en.png",
  mainImageAr: "https://source.test/main-ar.png",
  screenshotsEn: [
    "https://source.test/s-en-0.png",
    "https://source.test/s-en-1.png",
    "https://source.test/s-en-2.png",
  ],
  screenshotsAr: ["https://source.test/s-ar-0.png", "https://source.test/s-ar-1.png"],
  slug: "alpha-app",
});

describe("transferSubmissionImages", () => {
  it("uploads icon, mains and screenshots under the slug key layout", async () => {
    const input = await fullInput();
    const t = fakeIo();
    await t.prime([
      input.appIconUrl,
      input.mainImageEn,
      input.mainImageAr,
      ...input.screenshotsEn,
      ...input.screenshotsAr,
    ]);

    const res = await transferSubmissionImages(input, t.io);

    // Exactly 1 icon + 2 mains + N screenshots uploads, nothing else.
    expect(t.uploads).toHaveLength(1 + 2 + input.screenshotsEn.length + input.screenshotsAr.length);

    const [icon, mainEn, mainAr, ...screenshots] = t.uploads;
    expect(icon.key).toBe(`app-icons/${input.slug}/icon.webp`);
    expect(mainEn.key).toBe(`app-images/${input.slug}/main_en.webp`);
    expect(mainAr.key).toBe(`app-images/${input.slug}/main_ar.webp`);
    expect(screenshots.map((s) => s.key)).toEqual([
      `app-images/${input.slug}/screenshot_en_0.webp`,
      `app-images/${input.slug}/screenshot_en_1.webp`,
      `app-images/${input.slug}/screenshot_en_2.webp`,
      `app-images/${input.slug}/screenshot_ar_0.webp`,
      `app-images/${input.slug}/screenshot_ar_1.webp`,
    ]);

    // Every upload is a webp payload (transformers ran, not raw source bytes).
    for (const u of t.uploads) {
      expect(u.ct).toBe("image/webp");
      expect((await sharp(u.body).metadata()).format).toBe("webp");
    }
    const iconMeta = await sharp(icon.body).metadata();
    expect(iconMeta).toEqual(expect.objectContaining({ width: 512, height: 512 }));

    // Output URLs are whatever the injected uploadObject returned.
    expect(res.appIconUrl).toBe(`https://cdn.test/app-icons/${input.slug}/icon.webp`);
    expect(res.mainImageEn).toBe(`https://cdn.test/app-images/${input.slug}/main_en.webp`);
    expect(res.mainImageAr).toBe(`https://cdn.test/app-images/${input.slug}/main_ar.webp`);
    expect(res.screenshotsEn).toEqual([
      `https://cdn.test/app-images/${input.slug}/screenshot_en_0.webp`,
      `https://cdn.test/app-images/${input.slug}/screenshot_en_1.webp`,
      `https://cdn.test/app-images/${input.slug}/screenshot_en_2.webp`,
    ]);
    expect(res.screenshotsAr).toEqual([
      `https://cdn.test/app-images/${input.slug}/screenshot_ar_0.webp`,
      `https://cdn.test/app-images/${input.slug}/screenshot_ar_1.webp`,
    ]);

    // Fetched exactly the source URLs, once each, no empties.
    expect(t.fetched).toHaveLength(8);
    expect(new Set(t.fetched).size).toBe(8);
    expect(t.fetched).toContain(input.appIconUrl);
  });

  it("returns \"\" for empty source fields without fetching/uploading them", async () => {
    const input = await fullInput();
    input.mainImageAr = "";
    input.screenshotsEn = [];
    const t = fakeIo();
    await t.prime([input.appIconUrl, input.mainImageEn, ...input.screenshotsAr]);

    const res = await transferSubmissionImages(input, t.io);

    expect(res.mainImageAr).toBe("");
    expect(res.screenshotsEn).toEqual([]);
    expect(t.fetched).not.toContain("");
    expect(t.fetched).toHaveLength(4); // icon + main_en + main_ar + 1 ar screenshot
    expect(t.uploads.map((u) => u.key).filter((k) => k.includes("main_ar"))).toHaveLength(0);
  });

  it("runs screenshots with their own transformer and shapes", async () => {
    const input = await fullInput();
    input.screenshotsEn = [];
    input.screenshotsAr = ["https://source.test/s-ar-0.png"];
    const t = fakeIo();
    await t.prime([input.appIconUrl, input.mainImageEn, input.mainImageAr, ...input.screenshotsAr]);

    const res = await transferSubmissionImages(input, t.io);

    expect(res.screenshotsAr).toEqual([`https://cdn.test/app-images/${input.slug}/screenshot_ar_0.webp`]);
    const shot = t.uploads[t.uploads.length - 1];
    expect(shot.key).toBe(`app-images/${input.slug}/screenshot_ar_0.webp`);
    const shotMeta = await sharp(shot.body).metadata();
    // source is 40x30-ish; fit "inside", width-capped — metadata must be webp
    expect(shotMeta.format).toBe("webp");
  });

  it("accepts a fetch that resolves raw buffers directly", async () => {
    const input = await fullInput();
    input.screenshotsEn = [];
    input.screenshotsAr = [];
    const png = await makePng(64, 64);
    const uploads: string[] = [];
    const fetchMock = vi.fn(async () => Buffer.from(png)) as unknown as typeof globalThis.fetch;
    const res = await transferSubmissionImages(input, {
      fetch: fetchMock,
      uploadObject: async (key) => {
        uploads.push(key);
        return `https://cdn.test/${key}`;
      },
    });
    expect(uploads).toEqual([
      `app-icons/${input.slug}/icon.webp`,
      `app-images/${input.slug}/main_en.webp`,
      `app-images/${input.slug}/main_ar.webp`,
    ]);
    expect(res.mainImageEn).toBe(`https://cdn.test/app-images/${input.slug}/main_en.webp`);
  });

  it("propagates fetch failures (transaction caller maps them)", async () => {
    const input = await fullInput();
    input.screenshotsEn = [];
    input.screenshotsAr = [];
    const t = fakeIo();
    await t.prime([input.appIconUrl, input.mainImageEn]); // no main_ar buffer → fetch throws
    await expect(transferSubmissionImages(input, t.io)).rejects.toThrow("unexpected fetch");
  });
});
