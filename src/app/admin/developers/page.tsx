import { Suspense } from "react";
import Link from "next/link";
import {
  getAllDevelopers,
  getDeveloperAppCount,
  getDeveloperForEdit,
  type DeveloperEditRow,
} from "@/lib/repo/admin";
import { deleteDeveloper } from "@/lib/actions/admin-taxonomy";
import { DeveloperForm, type DeveloperInitial } from "@/components/admin/taxonomy-editor";
import ConfirmSubmit from "@/components/admin/confirm-submit";

// FK CASCADE warns loudly: deleting a developer deletes their apps.
const DEV_DELETE_CONFIRM_APPS =
  "سيتم حذف المطور نهائيًا. سيتم حذف تطبيقات المطور المرتبطة. هل تريد المتابعة؟";
const DEV_DELETE_CONFIRM_EMPTY = "سيتم حذف المطور نهائيًا. هل تريد المتابعة؟";

const thCls = "px-3 py-2 text-start font-medium";

function ContentSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default function DevelopersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">المطورون</h1>
      <Suspense fallback={<ContentSkeleton />}>
        <DevelopersContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function parseEdit(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toInitial(d: DeveloperEditRow): DeveloperInitial {
  return {
    id: Number(d.id),
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    website: d.website ?? "",
    email: d.email ?? "",
    logoUrl: d.logoUrl ?? "",
    descriptionEn: d.descriptionEn,
    descriptionAr: d.descriptionAr,
    socialUrls: Object.values(d.socialLinks),
    isVerified: d.isVerified,
  };
}

async function DevelopersContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const editId = parseEdit(sp.edit);

  const developers = await getAllDevelopers();
  const editing = editId !== null ? await getDeveloperForEdit(editId) : null;
  const editingInitial = editing ? toInitial(editing) : null;

  // Per-row linked-app count feeds the cascade warning + the count column.
  const counts = await Promise.all(developers.map((d) => getDeveloperAppCount(d.id)));

  return (
    <div className="flex flex-col gap-4">
      {/* key: remount the island whenever the edited id changes so state re-reads the initials */}
      <DeveloperForm key={editingInitial?.id ?? "new"} editing={editingInitial} />

      {developers.length === 0 ? (
        <p className="rounded-app bg-card p-6 text-center text-sm text-text-secondary shadow-app">
          لا يوجد مطورون بعد — أضف المطوّر الأول من النموذج أعلاه.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-app bg-card shadow-app">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                <th className={thCls}>الاسم (EN)</th>
                <th className={thCls}>الاسم (AR)</th>
                <th className={thCls}>الموقع</th>
                <th className={thCls}>موثّق</th>
                <th className={thCls}>التطبيقات</th>
                <th className={thCls}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {developers.map((d, i) => {
                const count = counts[i] ?? 0;
                return (
                  <tr
                    key={d.id}
                    className={`border-b border-border last:border-b-0 ${
                      d.id === editing?.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-text">{d.nameEn}</td>
                    <td className="px-3 py-2 text-text">{d.nameAr}</td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-text-secondary" dir="ltr">
                      {d.website || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={d.isVerified ? "text-green-600" : "text-text-secondary"}>
                        {d.isVerified ? "✓" : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text">
                      {count > 0 ? <span className="font-bold">{count}</span> : <span className="text-text-secondary">0</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/developers?edit=${d.id}`}
                          aria-current={d.id === editing?.id ? "true" : undefined}
                          className="rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10"
                        >
                          تعديل
                        </Link>
                        <ConfirmSubmit
                          confirmMessage={count > 0 ? DEV_DELETE_CONFIRM_APPS : DEV_DELETE_CONFIRM_EMPTY}
                          label="حذف"
                          action={deleteDeveloper.bind(null, d.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-secondary">الإجمالي: {developers.length}</p>
    </div>
  );
}
