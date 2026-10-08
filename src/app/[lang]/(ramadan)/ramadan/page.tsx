import type { Metadata } from "next";
import Link from "next/link";
import { getLang, isLocale } from "@/lib/i18n";
import sectionsData from "./ramadan-sections.json";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMetadata(lang, "/ramadan", "رمضان 1447", "مع القرآن.. رفقة أقرب");
}

type RamadanApp = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  short_description_ar: string;
  short_description_en: string;
  application_icon: string;
};

type RamadanSection = {
  id: string;
  title_ar: string;
  subtitle_ar: string;
  description_ar: string;
  title_en: string;
  subtitle_en: string;
  description_en: string;
  image: string;
  apps: RamadanApp[];
};

const sections = sectionsData as RamadanSection[];

export default async function RamadanPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang({ lang });
  const isAr = locale === "ar";

  return (
    <main className="ramadan-page">
      {/* Hero */}
      <section className="relative overflow-hidden pb-10 pt-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/RamadanHerobackground.webp"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="relative mx-auto max-w-3xl px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/ramadan.png"
            alt="Ramadan 1447"
            width={280}
            height={187}
            className="mx-auto"
            fetchPriority="high"
          />
          <h1 className="mt-4 text-4xl font-bold text-white">
            مع القرآن.. رفقة أقرب
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            نبحث في رمضان عن السكينة، ونمنح القرآن حضورًا دائمًا يرافقنا طوال الشهر. في هذا الدليل
            جمعنا لك ترشيحات لتطبيقات قرآنية متنوعة مناسبة لرمضان، لنمنحك تجربة روحية مميزة في هذا
            الشهر الكريم.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10">
        {sections.map((section, i) => {
          const reversed = i % 2 === 1;
          const image = section.image.replace("assets/images/", "/images/");
          return (
            <div
              key={section.id}
              className={`flex flex-col items-center gap-8 ${reversed ? "md:flex-row-reverse" : "md:flex-row"}`}
            >
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {isAr ? section.title_ar : section.title_en}
                </h2>
                <p className="mt-1 text-sm text-[#ff8c42]">
                  {isAr ? section.subtitle_ar : section.subtitle_en}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {isAr ? section.description_ar : section.description_en}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  {section.apps.map((app) => (
                    <Link
                      key={app.id}
                      href={`/${locale}/app/${app.slug || app.id}`}
                      className="flex items-center gap-3 rounded-app border border-white/10 bg-white/5 p-3 transition-colors hover:border-[#ff8c42]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={app.application_icon}
                        alt={isAr ? app.name_ar : app.name_en}
                        width={44}
                        height={44}
                        loading="lazy"
                        className="rounded-app"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-white">
                          {isAr ? app.name_ar : app.name_en}
                        </h4>
                        <p className="truncate text-xs text-white/70">
                          {isAr ? app.short_description_ar : app.short_description_en}
                        </p>
                      </div>
                      <span className="rounded-app bg-[#ff8c42] px-3 py-1.5 text-xs font-bold text-black">
                        {isAr ? "تفاصيل التطبيق" : "Download"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-xs shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={section.title_ar}
                  loading={i < 2 ? "eager" : "lazy"}
                  className="w-full rounded-app"
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Community CTA + custom footer */}
      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center">
          <h3 className="text-xl font-bold text-white">رمضان فرصة للمشاركة</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            مجتمع إتقان يجمع المهتمين بخدمة القرآن عبر التقنية، بالمشاركة، والتجربة، وتبادل
            الترشيحات والأفكار.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            انضم إلينا في رمضان، شاركنا ما تستخدمه، اقترح تطبيقات، أو شارك في تطوير مشاريع تخدم
            القرآن خلال الشهر المبارك.
          </p>
          <a
            href="https://community.itqan.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-app bg-[#ff8c42] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#ff7b2e]"
          >
            انضم إلى مجتمع إتقان
          </a>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-white/70">
              مشروع مفتوح المصدر، أحد مشاريع مجتمع إتقان لتقنيات القرآن، ١٤٤٧ هـ
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">المنصة برعاية</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/charity.svg" alt="" width={22} height={22} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/maknon.png" alt="" width={64} height={24} />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
