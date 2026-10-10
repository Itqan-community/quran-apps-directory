import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SubmissionDetail } from "@/lib/repo/admin";
import { getSubmissionDetail } from "@/lib/repo/admin";
import StatusBadge from "@/components/admin/status-badge";
import SubmissionActions, { AdminNotesEditor } from "@/components/admin/submission-actions";

const dateTimeFmt = new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" });

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-16 animate-pulse rounded-app bg-surface" />
      <div className="h-64 animate-pulse rounded-app border border-border bg-surface" />
    </div>
  );
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">مراجعة طلب إضافة تطبيق</h1>
        <Link href="/admin/submissions" className="text-sm text-primary hover:underline">
          ← العودة إلى القائمة
        </Link>
      </div>
      <Suspense fallback={<DetailSkeleton />}>
        <DetailContent params={params} />
      </Suspense>
    </main>
  );
}

async function DetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const detail =
    Number.isInteger(numId) && numId > 0 ? await getSubmissionDetail(numId) : null;
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-4">
      <SubmissionActions
        submissionId={detail.id}
        status={detail.status}
        hasCreatedApp={detail.createdApp !== null}
      />
      <TrackingSection detail={detail} />
      <SubmitterSection detail={detail} />
      <AppDetailsSection detail={detail} />
      <LinksSection detail={detail} />
      <CategoriesSection detail={detail} />
      <DeveloperSection detail={detail} />
      <MediaSection detail={detail} />
      <ReviewSection detail={detail} />
      <LogSection detail={detail} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-app bg-card p-4 shadow-app">
      <h2 className="mb-3 text-sm font-bold text-text-secondary">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}

function Dl({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{children}</dl>;
}

function dash(v: string | null | undefined): string {
  return v ? v : "—";
}

function TrackingSection({ detail }: { detail: SubmissionDetail }) {
  return (
    <Section title="التتبع والحالة">
      <Dl>
        <Field label="رقم التتبع">
          <span className="font-mono font-bold">{detail.trackingId}</span>
        </Field>
        <Field label="الحالة">
          <StatusBadge status={detail.status} kind="submission" />
        </Field>
        <Field label="تاريخ الطلب">{dateTimeFmt.format(detail.submittedAt)}</Field>
        <Field label="آخر تحديث">{dateTimeFmt.format(detail.updatedAt)}</Field>
      </Dl>
      <p className="mt-3 text-xs text-text-secondary">
        تتغير الحالة فقط من خلال أزرار الإجراءات أعلاه.
      </p>
    </Section>
  );
}

function SubmitterSection({ detail }: { detail: SubmissionDetail }) {
  const s = detail.submitter;
  return (
    <Section title="بيانات مقدم الطلب">
      <Dl>
        <Field label="الاسم">{dash(s.name)}</Field>
        <Field label="البريد الإلكتروني">{dash(s.email)}</Field>
        <Field label="رقم الهاتف">{dash(s.phone)}</Field>
        <Field label="الجهة / المؤسسة">{dash(s.organization)}</Field>
        <Field label="النوع">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              s.isDeveloper ? "bg-green-600 text-white" : "bg-gray-300 text-text"
            }`}
          >
            {s.isDeveloper ? "مطوّر" : "غير مطوّر"}
          </span>
        </Field>
      </Dl>
    </Section>
  );
}

function AppDetailsSection({ detail }: { detail: SubmissionDetail }) {
  const a = detail.app;
  return (
    <Section title="تفاصيل التطبيق">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold text-primary">English</h3>
          <dl className="grid gap-3">
            <Field label="الاسم (EN)">{dash(a.nameEn)}</Field>
            <Field label="الوصف المختصر (EN)">{dash(a.shortDescriptionEn)}</Field>
            <Field label="الوصف الكامل (EN)">
              <p className="whitespace-pre-line">{dash(a.descriptionEn)}</p>
            </Field>
          </dl>
        </div>
        <div className="border-t border-border pt-4 md:border-t-0 md:border-s md:pt-0 md:ps-6">
          <h3 className="mb-2 text-xs font-bold text-primary">العربية</h3>
          <dl className="grid gap-3">
            <Field label="الاسم (AR)">{dash(a.nameAr)}</Field>
            <Field label="الوصف المختصر (AR)">{dash(a.shortDescriptionAr)}</Field>
            <Field label="الوصف الكامل (AR)">
              <p className="whitespace-pre-line">{dash(a.descriptionAr)}</p>
            </Field>
          </dl>
        </div>
      </div>
    </Section>
  );
}

const LINK_ROWS: { key: keyof SubmissionDetail["links"]; label: string }[] = [
  { key: "googlePlay", label: "Google Play" },
  { key: "appStore", label: "App Store" },
  { key: "appGallery", label: "AppGallery" },
  { key: "website", label: "الموقع الإلكتروني" },
];

function LinksSection({ detail }: { detail: SubmissionDetail }) {
  return (
    <Section title="الروابط">
      <ul className="grid gap-2">
        {LINK_ROWS.map(({ key, label }) => {
          const url = detail.links[key];
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <span className={url ? "text-green-600" : "text-red-500"}>{url ? "✓" : "✗"}</span>
              <span className="w-28 shrink-0 text-text-secondary">{label}</span>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-primary hover:underline"
                  dir="ltr"
                >
                  {url}
                </a>
              ) : (
                <span className="text-text-secondary">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function CategoriesSection({ detail }: { detail: SubmissionDetail }) {
  return (
    <Section title="الفئات">
      {detail.categories.length === 0 ? (
        <p className="text-sm text-text-secondary">لا توجد فئات محددة</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {detail.categories.map((c) => (
            <li
              key={c.id}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {c.nameAr || c.nameEn}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function DeveloperSection({ detail }: { detail: SubmissionDetail }) {
  const d = detail.developer;
  return (
    <Section title="بيانات المطور المُقدمة">
      <Dl>
        <Field label="اسم المطور (EN)">{dash(d.nameEn)}</Field>
        <Field label="اسم المطور (AR)">{dash(d.nameAr)}</Field>
        <Field label="الموقع الإلكتروني">
          {d.website ? (
            <a
              href={d.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              dir="ltr"
            >
              {d.website}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="البريد الإلكتروني">{dash(d.email)}</Field>
      </Dl>
    </Section>
  );
}

function MediaImg({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" />
  );
}

function ScreenshotRow({ title, screenshots }: { title: string; screenshots: string[] }) {
  const shown = screenshots.slice(0, 5);
  const extra = Math.max(0, screenshots.length - 5);
  return (
    <div>
      <p className="mb-1 text-xs text-text-secondary">
        {title} ({screenshots.length})
      </p>
      {screenshots.length === 0 ? (
        <p className="text-sm text-text-secondary">لا توجد لقطات</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {shown.map((src, i) => (
            <MediaImg
              key={`${src}-${i}`}
              src={src}
              alt={`${title} ${i + 1}`}
              className="h-[150px] w-auto rounded border border-border object-cover"
            />
          ))}
          {extra > 0 && (
            <span className="flex h-[150px] items-center text-sm text-text-secondary">
              +{extra} أخرى
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MediaSection({ detail }: { detail: SubmissionDetail }) {
  const m = detail.media;
  return (
    <Section title="الوسائط">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-xs text-text-secondary">أيقونة التطبيق</p>
          {m.appIconUrl ? (
            <MediaImg
              src={m.appIconUrl}
              alt="أيقونة التطبيق"
              className="h-[100px] w-[100px] rounded-xl object-cover"
            />
          ) : (
            <p className="text-sm text-text-secondary">لم تُرفع أيقونة</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-text-secondary">الصورة الرئيسية (EN)</p>
            {m.mainImageEn ? (
              <MediaImg
                src={m.mainImageEn}
                alt="الصورة الرئيسية (EN)"
                className="h-[200px] w-auto rounded-lg border border-border object-cover"
              />
            ) : (
              <p className="text-sm text-text-secondary">لا توجد صورة</p>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs text-text-secondary">الصورة الرئيسية (AR)</p>
            {m.mainImageAr ? (
              <MediaImg
                src={m.mainImageAr}
                alt="الصورة الرئيسية (AR)"
                className="h-[200px] w-auto rounded-lg border border-border object-cover"
              />
            ) : (
              <p className="text-sm text-text-secondary">لا توجد صورة</p>
            )}
          </div>
        </div>
        <ScreenshotRow title="لقطات الشاشة (EN)" screenshots={m.screenshotsEn} />
        <ScreenshotRow title="لقطات الشاشة (AR)" screenshots={m.screenshotsAr} />
      </div>
    </Section>
  );
}

function ReviewSection({ detail }: { detail: SubmissionDetail }) {
  return (
    <Section title="المراجعة">
      <div className="flex flex-col gap-4">
        <AdminNotesEditor submissionId={detail.id} initialNotes={detail.adminNotes} />
        {detail.rejectionReason && (
          <div className="rounded-app border border-red-300 bg-red-50 px-3 py-2">
            <p className="text-xs font-bold text-red-700">سبب الرفض (مُرسل لمقدم الطلب)</p>
            <p className="whitespace-pre-line text-sm text-red-700">{detail.rejectionReason}</p>
          </div>
        )}
        {detail.infoRequestMessage && (
          <div className="rounded-app border border-purple-300 bg-purple-50 px-3 py-2">
            <p className="text-xs font-bold text-purple-700">رسالة طلب المعلومات</p>
            <p className="whitespace-pre-line text-sm text-purple-700">
              {detail.infoRequestMessage}
            </p>
          </div>
        )}
        <Dl>
          {detail.reviewedAt && (
            <Field label="تاريخ المراجعة">{dateTimeFmt.format(detail.reviewedAt)}</Field>
          )}
          <Field label="التطبيق المُنشأ">
            {detail.createdApp ? (
              <Link
                href={`/admin/apps/${detail.createdApp.id}`}
                className="font-medium text-primary hover:underline"
              >
                {detail.createdApp.nameEn || detail.createdApp.id}
              </Link>
            ) : (
              <span className="text-text-secondary">لم يُنشئ تطبيق بعد</span>
            )}
          </Field>
        </Dl>
      </div>
    </Section>
  );
}

function LogSection({ detail }: { detail: SubmissionDetail }) {
  return (
    <Section title="سجل الحالات">
      {detail.logs.length === 0 ? (
        <p className="text-sm text-text-secondary">لا توجد تغييرات حالة</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                <th className="px-2 py-2 text-start font-medium">من</th>
                <th className="px-2 py-2 text-start font-medium">إلى</th>
                <th className="px-2 py-2 text-start font-medium">بواسطة</th>
                <th className="px-2 py-2 text-start font-medium">ملاحظات</th>
                <th className="px-2 py-2 text-start font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {detail.logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-2">
                    {log.fromStatus ? (
                      <StatusBadge status={log.fromStatus} kind="submission" />
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <StatusBadge status={log.toStatus} kind="submission" />
                  </td>
                  <td className="px-2 py-2 text-text">{dash(log.changedBy)}</td>
                  <td className="px-2 py-2 text-text">{dash(log.notes)}</td>
                  <td className="px-2 py-2 text-text-secondary">
                    {dateTimeFmt.format(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
