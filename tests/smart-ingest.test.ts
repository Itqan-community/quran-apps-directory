import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import postgres from "postgres";
import {
  buildAppDocument,
  loadAppBundle,
  upsertAppEmbedding,
  type AppDocumentBundle,
} from "@/lib/ai/ingest";
import { EmbeddingUnavailableError, type EmbeddingProvider } from "@/lib/ai/types";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

// ---------------------------------------------------------------------------
// Unit: buildAppDocument (no DB)
// ---------------------------------------------------------------------------

function makeBundle(over: Partial<AppDocumentBundle> = {}): AppDocumentBundle {
  return {
    id: 1,
    nameEn: "Alpha",
    nameAr: "ألفا",
    slug: "alpha",
    shortEn: "short en",
    shortAr: "وصف قصير",
    fullEn: "full en",
    fullAr: "وصف كامل",
    platform: "android",
    featured: false,
    avgRating: "4.50",
    reviewCount: 120,
    categories: [{ nameEn: "Mushaf", nameAr: "مصحف" }],
    developer: { nameEn: "Dev A", nameAr: "مطور أ", isVerified: false },
    labels: [],
    riwayah: ["hafs"],
    mushafType: ["madani"],
    features: ["offline"],
    crawledContent: null,
    googlePlayLink: null,
    appStoreLink: null,
    appGalleryLink: null,
    ...over,
  };
}

describe("buildAppDocument", () => {
  it("builds bilingual doc with truncation 1000 and external 2000", () => {
    const b = makeBundle({
      fullEn: "d".repeat(1500),
      crawledContent: "x".repeat(3000),
    });
    const doc = buildAppDocument(b);
    expect(doc).toContain("[APP] Alpha | ألفا");
    expect(doc).toContain("[EXTERNAL]");
    expect(doc).toContain("x".repeat(2000));
    expect(doc).not.toContain("x".repeat(2001));
    expect(doc).toContain("d".repeat(1000));
    expect(doc).not.toContain("d".repeat(1001));
  });

  it("skips empty description sections without emitting undefined", () => {
    const doc = buildAppDocument(makeBundle({ shortEn: "", shortAr: "", fullEn: "", fullAr: "" }));
    expect(doc).not.toMatch(/undefined|NaN|\[FULL DESC EN\]\s*(\n|$)/);
    expect(doc).not.toContain("[SHORT DESC EN]");
    expect(doc).not.toContain("[SHORT DESC AR]");
    expect(doc).not.toContain("[FULL DESC AR]");
  });

  it("quality wording tiers", () => {
    expect(buildAppDocument(makeBundle({ avgRating: "4.50" }))).toContain("4.50/5 (Excellent)");
    expect(buildAppDocument(makeBundle({ avgRating: "4.00" }))).toContain("4.00/5 (Very Good)");
    expect(buildAppDocument(makeBundle({ avgRating: "3.00" }))).toContain("3.00/5 (Good)");
    expect(buildAppDocument(makeBundle({ avgRating: "2.00" }))).toContain("2.00/5 (Average)");
    expect(buildAppDocument(makeBundle({ avgRating: "0.00" }))).toContain("0.00/5 (Low)");
  });

  it("platform section lists stores per truthy link; featured and verified add their lines", () => {
    const doc = buildAppDocument(
      makeBundle({
        googlePlayLink: "https://play.example",
        appStoreLink: "https://store.example",
        featured: true,
        developer: { nameEn: "Dev A", nameAr: "مطور أ", isVerified: true },
      })
    );
    expect(doc).toContain("[PLATFORM] android + Available on Google Play + Available on App Store");
    expect(doc).not.toContain("AppGallery");
    expect(doc).toContain("[FEATURED] yes");
    expect(doc).toContain("[DEVELOPER] Dev A | مطور أ + VERIFIED DEVELOPER");
  });

  it("metadata sections join bilingual labels with raw array values, deduped", () => {
    const doc = buildAppDocument(
      makeBundle({
        labels: [
          { type: "riwayah", value: "warsh", labelEn: "Warsh", labelAr: "ورش" },
          { type: "features", value: "offline", labelEn: "Offline", labelAr: "بدون إنترنت" },
        ],
        riwayah: ["hafs", "warsh"],
        features: ["offline", "audio"],
      })
    );
    expect(doc).toContain("[RIWAYAH] Warsh (ورش), hafs");
    expect(doc).toContain("[FEATURES] Offline (بدون إنترنت), audio");
    expect(doc).toContain("[MUSHAF] madani");
  });

  it("emits sections in the contract order", () => {
    const doc = buildAppDocument(
      makeBundle({ featured: true, crawledContent: "ext", googlePlayLink: "https://play.example" })
    );
    const headers = [
      "[APP]",
      "[CATEGORIES]",
      "[DEVELOPER]",
      "[SHORT DESC EN]",
      "[SHORT DESC AR]",
      "[FULL DESC EN]",
      "[FULL DESC AR]",
      "[PLATFORM]",
      "[QUALITY]",
      "[FEATURED]",
      "[RIWAYAH]",
      "[MUSHAF]",
      "[FEATURES]",
      "[EXTERNAL]",
    ];
    const positions = headers.map((h) => doc.indexOf(h));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

// ---------------------------------------------------------------------------
// Integration: loadAppBundle + upsertAppEmbedding (test DB)
// ---------------------------------------------------------------------------

let devId = 0;
let catId = 0;
let appId = 0;
let metaTypeId = 0;
let metaOptionId = 0;

beforeEach(() => {
  // Default provider path (upsertAppEmbedding without opts.provider) must be
  // the network-free mock in tests.
  vi.unstubAllEnvs();
  vi.stubEnv("AI_SEARCH_PROVIDER", "mock");
});

beforeAll(async () => {
  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES ('T:Ingest Dev', 'مطور التضمين')
    RETURNING id
  `;
  devId = d[0].id;

  const c = await sql`
    INSERT INTO categories (name_en, name_ar, slug)
    VALUES ('T:Ingest Mushaf', 'مصحف التضمين', 't-ingest-mushaf')
    RETURNING id
  `;
  catId = c[0].id;

  const a = await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, review_count, sort_order, platform, featured, status, developer_id,
       google_play_link, app_store_link, app_gallery_link,
       riwayah, mushaf_type, features)
    VALUES
      ('t-ingest-app', 'Ingest Alpha', 'ألفا التضمين', 'short en', 'وصف قصير', 'full en', 'وصف كامل',
       'i.png', 'c.png', 'c.png', '4.50', 120, 1, 'android', true, 'published', ${devId},
       'https://play.example.com/ingest', 'https://store.example.com/ingest', NULL,
       '["hafs","warsh"]'::jsonb, '["madani"]'::jsonb, '["offline","audio"]'::jsonb)
    RETURNING id
  `;
  appId = a[0].id;

  await sql`INSERT INTO apps_categories (app_id, category_id) VALUES (${appId}, ${catId})`;

  const mt = await sql`
    INSERT INTO metadata_types (name, label_en, label_ar) VALUES ('riwayah', 'Riwayah', 'رواية')
    RETURNING id
  `;
  metaTypeId = mt[0].id;
  const mo = await sql`
    INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar)
    VALUES (${metaTypeId}, 'warsh', 'Warsh', 'ورش')
    RETURNING id
  `;
  metaOptionId = mo[0].id;
  await sql`INSERT INTO app_metadata_values (app_id, metadata_option_id) VALUES (${appId}, ${metaOptionId})`;

  // Two linked submissions: the latest (higher id) must win for crawled content.
  await sql`
    INSERT INTO app_submissions
      (tracking_id, submitter_email, submitter_organization, app_name_en, crawled_content, created_app_id)
    VALUES
      ('QAD-TING5T1', 'ingest@test.local', 'T:Ingest Org', 'Ingest Alpha', 'old crawl body', ${appId}),
      ('QAD-TING5T2', 'ingest@test.local', 'T:Ingest Org', 'Ingest Alpha', 'new crawl body', ${appId})
  `;
});

afterAll(async () => {
  await sql`DELETE FROM app_submissions WHERE tracking_id IN ('QAD-TING5T1', 'QAD-TING5T2')`;
  await sql`DELETE FROM app_metadata_values WHERE app_id = ${appId}`;
  await sql`DELETE FROM apps WHERE slug = 't-ingest-app'`;
  await sql`DELETE FROM metadata_options WHERE id = ${metaOptionId}`;
  await sql`DELETE FROM metadata_types WHERE id = ${metaTypeId}`;
  await sql`DELETE FROM categories WHERE slug = 't-ingest-mushaf'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Ingest Dev'`;
  await sql.end();
});

describe("upsertAppEmbedding", () => {
  it("embeds via mock provider and is idempotent on unchanged doc", async () => {
    const first = await upsertAppEmbedding(appId);
    expect(first.status).toBe("embedded");

    const row = await sql`SELECT embedding, doc_hash, embedded_at FROM apps WHERE id = ${appId}`;
    expect(row[0].doc_hash).toBeTruthy();
    expect(row[0].embedded_at).not.toBeNull();
    const dims = await sql`SELECT vector_dims(embedding) AS d FROM apps WHERE id = ${appId}`;
    expect(dims[0].d).toBe(768);

    expect((await upsertAppEmbedding(appId)).status).toBe("skipped");

    await sql`UPDATE apps SET description_en = 'changed description' WHERE id = ${appId}`;
    expect((await upsertAppEmbedding(appId)).status).toBe("embedded");
  });

  it("broken provider propagates typed error (callers catch)", async () => {
    // Clear the stored hash so the upsert reaches the provider (otherwise the
    // unchanged-doc skip returns before any embedding happens).
    await sql`UPDATE apps SET doc_hash = NULL WHERE id = ${appId}`;
    const brokenProvider: EmbeddingProvider = {
      name: "mock",
      dimensions: 768,
      embedDocument: async () => {
        throw new EmbeddingUnavailableError("simulated outage");
      },
      embedQuery: async () => {
        throw new EmbeddingUnavailableError("simulated outage");
      },
    };
    await expect(upsertAppEmbedding(appId, { provider: brokenProvider }))
      .rejects.toBeInstanceOf(EmbeddingUnavailableError);
  });

  it("wrong-dimension vector throws typed error", async () => {
    await sql`UPDATE apps SET doc_hash = NULL WHERE id = ${appId}`;
    const shortProvider: EmbeddingProvider = {
      name: "mock",
      dimensions: 768,
      embedDocument: async () => [0.1, 0.2],
      embedQuery: async () => [0.1, 0.2],
    };
    await expect(upsertAppEmbedding(appId, { provider: shortProvider }))
      .rejects.toBeInstanceOf(EmbeddingUnavailableError);
  });

  it("returns app_not_found for a missing app", async () => {
    expect((await upsertAppEmbedding(99999999)).status).toBe("app_not_found");
  });

  it("metadata labels come from jsonb arrays + metadata_options (bilingual)", async () => {
    const bundle = await loadAppBundle(appId);
    expect(bundle).not.toBeNull();
    const doc = buildAppDocument(bundle!);
    expect(doc).toContain("[RIWAYAH]");
    expect(doc).toContain("Warsh (ورش)"); // metadata option label (bilingual)
    expect(doc).toContain("hafs"); // raw jsonb value without a metadata option
  });

  it("loadAppBundle assembles links, developer, categories and latest crawled content", async () => {
    const bundle = await loadAppBundle(appId);
    expect(bundle).not.toBeNull();
    expect(bundle!.googlePlayLink).toBe("https://play.example.com/ingest");
    expect(bundle!.appStoreLink).toBe("https://store.example.com/ingest");
    expect(bundle!.appGalleryLink).toBeNull();
    expect(bundle!.developer).toEqual({ nameEn: "T:Ingest Dev", nameAr: "مطور التضمين", isVerified: false });
    expect(bundle!.categories).toEqual([{ nameEn: "T:Ingest Mushaf", nameAr: "مصحف التضمين" }]);
    expect(bundle!.crawledContent).toBe("new crawl body"); // latest submission wins
    const doc = buildAppDocument(bundle!);
    expect(doc).toContain("[EXTERNAL] new crawl body");
    expect(doc).not.toContain("old crawl body");
  });
});
