import { toIconWebp, toMainWebp, toScreenshotWebp } from "@/lib/services/images";
import { uploadObject } from "@/lib/services/r2";

export type TransferInput = {
  appIconUrl: string;
  mainImageEn: string;
  mainImageAr: string;
  screenshotsEn: string[];
  screenshotsAr: string[];
  slug: string;
};

export type TransferResult = {
  appIconUrl: string;
  mainImageEn: string;
  mainImageAr: string;
  screenshotsEn: string[];
  screenshotsAr: string[];
};

const r2UploadObjectWrapper = (key: string, body: Buffer, ct?: string): Promise<string> =>
  uploadObject(key, body, ct);

type Kind = "icon" | "main" | "screenshot";

async function bytes(res: Response | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(res)) return res;
  return Buffer.from(new Uint8Array(await res.arrayBuffer()));
}

/**
 * fetch URL → transform by kind → upload under the old backend's key layout.
 * Empty source fields are skipped entirely (no fetch) and return "".
 */
async function transferOne(
  kind: Kind,
  url: string,
  key: string,
  io: { fetch: typeof fetch; uploadObject: (key: string, body: Buffer, ct?: string) => Promise<string> }
): Promise<string> {
  const body = await bytes(await io.fetch(url));
  const webp =
    kind === "icon" ? await toIconWebp(body) : kind === "main" ? await toMainWebp(body) : await toScreenshotWebp(body);
  return io.uploadObject(key, webp, "image/webp");
}

/**
 * Ports backend submissions upload_submission_images_to_r2 for the approve flow:
 * object keys mirror the Django App model storage paths
 * (app-icons/{slug}/icon.webp, app-images/{slug}/main_{lang}.webp,
 * app-images/{slug}/screenshot_{lang}_{i}.webp).
 */
export async function transferSubmissionImages(
  input: TransferInput,
  io: { fetch: typeof fetch; uploadObject: (key: string, body: Buffer, ct?: string) => Promise<string> } = {
    fetch: globalThis.fetch,
    uploadObject: r2UploadObjectWrapper,
  }
): Promise<TransferResult> {
  const { slug } = input;
  const result: TransferResult = {
    appIconUrl: "",
    mainImageEn: "",
    mainImageAr: "",
    screenshotsEn: [],
    screenshotsAr: [],
  };

  if (input.appIconUrl)
    result.appIconUrl = await transferOne("icon", input.appIconUrl, `app-icons/${slug}/icon.webp`, io);
  if (input.mainImageEn)
    result.mainImageEn = await transferOne("main", input.mainImageEn, `app-images/${slug}/main_en.webp`, io);
  if (input.mainImageAr)
    result.mainImageAr = await transferOne("main", input.mainImageAr, `app-images/${slug}/main_ar.webp`, io);
  for (let i = 0; i < input.screenshotsEn.length; i++)
    result.screenshotsEn.push(
      await transferOne("screenshot", input.screenshotsEn[i], `app-images/${slug}/screenshot_en_${i}.webp`, io)
    );
  for (let i = 0; i < input.screenshotsAr.length; i++)
    result.screenshotsAr.push(
      await transferOne("screenshot", input.screenshotsAr[i], `app-images/${slug}/screenshot_ar_${i}.webp`, io)
    );

  return result;
}
