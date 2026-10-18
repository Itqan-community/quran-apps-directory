import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getMetadataTypeWithOptions } from "@/lib/repo/admin";
import { OptionFormPage } from "@/components/admin/metadata-editor";

function FormSkeleton() {
  return <div className="h-96 animate-pulse rounded-app bg-surface" />;
}

export default function NewMetadataOptionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense fallback={<FormSkeleton />}>
        <NewContent params={params} />
      </Suspense>
    </main>
  );
}

async function NewContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  const type =
    Number.isInteger(numId) && numId > 0 ? await getMetadataTypeWithOptions(numId) : null;
  if (!type) notFound();

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">إضافة خيار — {type.labelAr}</h1>
        <Link
          href={`/admin/metadata/${type.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowRight aria-hidden className="size-4" />
          العودة إلى النوع
        </Link>
      </div>
      <OptionFormPage typeId={type.id} editing={null} />
    </>
  );
}
