import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Pencil, Plus } from "lucide-react";
import {
  getMetadataTypeWithOptions,
  type AdminMetadataTypeWithAllOptions,
} from "@/lib/repo/admin";
import { deleteMetadataOption, deleteMetadataType } from "@/lib/actions/admin-metadata";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import {
  EditMetadataTypeButton,
  type MetadataTypeInitial,
} from "@/components/admin/metadata-editor";
import {
  EmptyState,
  StatusPill,
  adminBodyRow,
  adminHeadRow,
  adminTable,
  adminTableWrap,
  adminTh,
} from "@/components/admin/ui";

const TYPE_DELETE_CONFIRM_APPS =
  "سيتم حذف نوع البيانات نهائيًا مع جميع خياراته وارتباطات التطبيقات بها. هل تريد المتابعة؟";
const TYPE_DELETE_CONFIRM_EMPTY =
  "سيتم حذف نوع البيانات نهائيًا مع جميع خياراته. هل تريد المتابعة؟";
const OPT_DELETE_CONFIRM_APPS =
  "سيتم حذف الخيار نهائيًا مع ارتباطات التطبيقات به. هل تريد المتابعة؟";
const OPT_DELETE_CONFIRM_EMPTY = "سيتم حذف الخيار نهائيًا. هل تريد المتابعة؟";

function ContentSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

export default function MetadataTypeHubPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/metadata"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowRight aria-hidden className="size-4" />
          العودة إلى الأنواع
        </Link>
      </div>
      <Suspense fallback={<ContentSkeleton />}>
        <HubContent params={params} />
      </Suspense>
    </main>
  );
}

function toInitial(t: AdminMetadataTypeWithAllOptions): MetadataTypeInitial & { id: number } {
  return {
    id: Number(t.id),
    name: t.name,
    labelEn: t.labelEn,
    labelAr: t.labelAr,
    descriptionEn: t.descriptionEn,
    descriptionAr: t.descriptionAr,
    isMultiSelect: t.isMultiSelect,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
    icon: t.icon ?? "",
  };
}

async function HubContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const type =
    Number.isInteger(numId) && numId > 0 ? await getMetadataTypeWithOptions(numId) : null;
  if (!type) notFound();

  const appsTotal = type.options.reduce((sum, o) => sum + o.appCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-app bg-card p-4 shadow-app">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-text">{type.labelAr}</h1>
          <span className="text-sm text-text-secondary" dir="ltr">
            {type.labelEn}
          </span>
          <span className="font-mono text-xs text-text-secondary" dir="ltr">
            {type.name}
          </span>
          <span className="text-xs text-text-secondary">
            {type.isMultiSelect ? "اختيار متعدد" : "اختيار واحد"}
          </span>
          <StatusPill active={type.isActive} />
          <div className="ms-auto flex items-center gap-2">
            <EditMetadataTypeButton initial={toInitial(type)} />
            <ConfirmSubmit
              confirmMessage={appsTotal > 0 ? TYPE_DELETE_CONFIRM_APPS : TYPE_DELETE_CONFIRM_EMPTY}
              label="حذف النوع"
              action={deleteMetadataType.bind(null, type.id)}
              redirectTo="/admin/metadata"
            />
          </div>
        </div>
        {(type.descriptionAr || type.descriptionEn) && (
          <p className="mt-2 text-sm text-text-secondary">
            {type.descriptionAr}
            {type.descriptionAr && type.descriptionEn && " — "}
            <span dir="ltr">{type.descriptionEn}</span>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-text">الخيارات ({type.options.length})</h2>
          <Link
            href={`/admin/metadata/${type.id}/options/new`}
            className="inline-flex items-center gap-1.5 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            <Plus aria-hidden className="size-4" />
            إضافة خيار
          </Link>
        </div>

        {type.options.length === 0 ? (
          <EmptyState
            icon={<Plus aria-hidden className="size-5" />}
            message="لا توجد خيارات بعد — أضف الخيار الأول من الزر أعلاه."
          />
        ) : (
          <div className={adminTableWrap}>
            <table className={adminTable}>
              <thead>
                <tr className={adminHeadRow}>
                  <th className={adminTh}>القيمة</th>
                  <th className={adminTh}>التسمية (EN)</th>
                  <th className={adminTh}>التسمية (AR)</th>
                  <th className={adminTh}>الاستخدام</th>
                  <th className={adminTh}>الحالة</th>
                  <th className={adminTh}>الترتيب</th>
                  <th className={adminTh}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {type.options.map((o) => (
                  <tr key={o.id} className={adminBodyRow}>
                    <td className="px-3 py-2 font-mono text-xs text-text" dir="ltr">
                      {o.value}
                    </td>
                    <td className="px-3 py-2 text-text" dir="ltr">
                      {o.labelEn}
                    </td>
                    <td className="px-3 py-2 text-text">{o.labelAr}</td>
                    <td className="px-3 py-2 text-text">
                      {o.appCount > 0 ? (
                        <span className="font-bold tabular-nums">{o.appCount} تطبيقات</span>
                      ) : (
                        <span className="text-text-secondary">0 تطبيقات</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill active={o.isActive} />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-text">{o.sortOrder}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/metadata/${type.id}/options/${o.id}`}
                          className="inline-flex items-center gap-1.5 rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10"
                        >
                          <Pencil aria-hidden className="size-3.5" />
                          تعديل
                        </Link>
                        <ConfirmSubmit
                          confirmMessage={
                            o.appCount > 0 ? OPT_DELETE_CONFIRM_APPS : OPT_DELETE_CONFIRM_EMPTY
                          }
                          label="حذف"
                          action={deleteMetadataOption.bind(null, o.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
