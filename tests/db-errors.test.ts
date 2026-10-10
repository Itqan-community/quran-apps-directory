import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", email: "admin@local.dev" } }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

// The mockRejected Error, set per-test; the factory may only read `mock*` vars.
const mockRejected = { current: undefined as unknown };

vi.mock("@/db", () => {
  // Awaitable chain stub: every builder method returns the same thenable → [].
  const makeChain = () => {
    const b: Record<string, unknown> = {};
    for (const k of ["from", "where", "limit", "for", "values", "set", "returning"]) {
      b[k] = () => b;
    }
    (b as { then: unknown }).then = (
      res?: (rows: unknown) => unknown,
      rej?: (e: unknown) => unknown
    ) => Promise.resolve([]).then(res, rej);
    return b;
  };
  return {
    db: {
      select: makeChain,
      insert: makeChain,
      update: makeChain,
      delete: makeChain,
      transaction: () => Promise.reject(mockRejected.current),
    },
  };
});

import { pgDupError } from "@/lib/db-errors";
import { categories } from "@/db/schema";
import { saveApp } from "@/lib/actions/admin-apps";
import { approveSubmission } from "@/lib/actions/admin-submissions";

const TEST_URL = process.env.TEST_DATABASE_URL!;
// A private drizzle client on the test DB — the mocked @/db must NOT intercept it.
const local = postgres(TEST_URL, { max: 1, prepare: false });
const localDb = drizzle(local);

const DUP_SLUG = "t-dbe-slug";
const DUP_NAME_EN = "T DBErr Cat";
const DUP_NAME_AR = "ت:خطأقاعدة";

/** Minimal valid saveApp create input (defaults flow through appFormSchema). */
const validAppInput = {
  nameEn: "T DBErr App",
  nameAr: "ت:خطأ تطبيق",
  shortDescriptionEn: "short",
  shortDescriptionAr: "قصير",
  descriptionEn: "desc",
  descriptionAr: "وصف",
  applicationIcon: "https://cdn.test/i.png",
  mainImageEn: "https://cdn.test/m.png",
  mainImageAr: "https://cdn.test/m.png",
  googlePlayLink: "https://play.google.com/store/apps/details?id=dbe",
  developerId: 1,
  platform: "ios",
  status: "draft",
};

beforeAll(async () => {
  await local`DELETE FROM categories WHERE slug = ${DUP_SLUG}`;
});

afterAll(async () => {
  await local`DELETE FROM categories WHERE slug = ${DUP_SLUG}`;
  await local.end();
});

beforeEach(() => {
  vi.clearAllMocks();
  // approveSubmission's step-1 gate: R2 must look configured.
  Object.assign(process.env, {
    R2_ENDPOINT: "https://r2.test",
    R2_ACCOUNT_ID: "acct",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "bucket",
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("pgDupError — normalization", () => {
  it("real drizzle→pg 23505: the thrown error is wrapped (no direct .code) and normalized", async () => {
    await localDb.insert(categories).values({ nameEn: DUP_NAME_EN, nameAr: DUP_NAME_AR, slug: DUP_SLUG });
    try {
      // Different EN/AR names so ONLY the slug collides → named index is deterministic.
      await localDb
        .insert(categories)
        .values({ nameEn: "T DBErr Two", nameAr: "ت:خطأثاني", slug: DUP_SLUG });
      throw new Error("expected the duplicate insert to throw 23505");
    } catch (e) {
      // Drizzle 0.45 wraps: the raw pg error lives on .cause, not on the thrown object.
      expect((e as { code?: string }).code).toBeUndefined();
      expect(pgDupError(e)).toEqual({ code: "23505", constraint: "categories_slug_unique" });
    }
  });

  it("wrapped DrizzleQueryError fixture (postgres.js constraint_name spelling)", () => {
    const err = {
      query: "insert into apps (...)",
      params: [],
      cause: { code: "23505", constraint_name: "apps_name_en_unique" },
    };
    expect(pgDupError(err)).toEqual({ code: "23505", constraint: "apps_name_en_unique" });
  });

  it("wrapped DrizzleQueryError fixture (legacy pg `constraint` spelling)", () => {
    const err = {
      query: "insert into categories (...)",
      params: [],
      cause: { code: "23505", constraint: "categories_slug_unique" },
    };
    expect(pgDupError(err)).toEqual({ code: "23505", constraint: "categories_slug_unique" });
  });

  it("unwrapped (no DrizzleQueryError shell) — both spellings", () => {
    expect(pgDupError({ code: "23505", constraint_name: "x_slug_unique" })).toEqual({
      code: "23505",
      constraint: "x_slug_unique",
    });
    expect(pgDupError({ code: "23505", constraint: "x_slug_unique" })).toEqual({
      code: "23505",
      constraint: "x_slug_unique",
    });
  });

  it("23505 with no constraint info → null constraint, still a dup", () => {
    expect(pgDupError({ code: "23505" })).toEqual({ code: "23505", constraint: null });
  });

  it("non-dup errors → null (fk violation, plain Error, undefined)", () => {
    expect(pgDupError({ code: "23503" })).toBeNull();
    expect(
      pgDupError({ query: "delete", params: [], cause: { code: "23503", constraint_name: "fk_x" } })
    ).toBeNull();
    expect(pgDupError(new Error("boom"))).toBeNull();
    expect(pgDupError(undefined)).toBeNull();
    expect(pgDupError(null)).toBeNull();
  });
});

describe("saveApp catch branch (transaction rejects; pre-checks pass)", () => {
  it("wrapped 23505 on the slug index → validation error on slug, per-call-site shape", async () => {
    mockRejected.current = {
      query: "update apps",
      params: [],
      cause: { code: "23505", constraint_name: "apps_slug_unique" },
    };
    const res = await saveApp({ ...validAppInput });
    expect(res).toEqual({
      ok: false,
      error: "validation",
      fieldErrors: { slug: ["الرابط (slug) مستخدم مسبقًا لعمل تطبيق آخر"] },
    });
  });

  it("wrapped 23505 on the name_en index → validation error on app_name_en", async () => {
    mockRejected.current = {
      query: "insert into apps",
      params: [],
      cause: { code: "23505", constraint_name: "apps_name_en_unique" },
    };
    const res = await saveApp({ ...validAppInput });
    expect(res).toEqual({
      ok: false,
      error: "validation",
      fieldErrors: { app_name_en: ["اسم التطبيق مستخدم مسبقًا"] },
    });
  });

  it("non-dup transaction failure keeps the pre-existing server-error shape", async () => {
    mockRejected.current = { code: "23503", constraint: "apps_developer_id_fk" };
    const res = await saveApp({ ...validAppInput });
    expect(res).toEqual({
      ok: false,
      error: "server",
      message: "تعذر حفظ التطبيق: خطأ غير متوقع.",
    });
  });
});

describe("approveSubmission catch branch (transaction rejects; pre-checks pass)", () => {
  it("wrapped 23505 → db result carrying the duplicate-name Arabic message", async () => {
    mockRejected.current = {
      query: "insert into apps",
      params: [],
      cause: { code: "23505", constraint_name: "apps_name_en_unique" },
    };
    const res = await approveSubmission(1);
    expect(res).toEqual({
      ok: false,
      error: "db",
      message: "تعذر إتمام الموافقة: اسم التطبيق مستخدم مسبقًا في الدليل.",
    });
  });

  it("non-dup failure → db result with the generic DB message (old else branch shape)", async () => {
    mockRejected.current = { query: "select", params: [], cause: { code: "23503" } };
    const res = await approveSubmission(1);
    expect(res).toEqual({
      ok: false,
      error: "db",
      message: "تعذر إتمام الموافقة: خطأ في قاعدة البيانات.",
    });
  });
});
