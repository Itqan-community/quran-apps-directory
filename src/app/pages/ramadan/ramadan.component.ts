import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
} from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { RouterModule } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzRateModule } from "ng-zorro-antd/rate";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ApiService, App } from "../../services/api.service";
import { OptimizedImageComponent } from "../../components/optimized-image/optimized-image.component";
import { Title, Meta } from "@angular/platform-browser";

export interface RamadanSection {
  id: string;
  title_ar: string;
  subtitle_ar: string;
  description_ar: string;
  title_en: string;
  subtitle_en: string;
  description_en: string;
  image: string;
  appSlugs: string[];
  appNamesAr: string[]; // fallback matching by Arabic name
  apps: App[];
}

@Component({
  selector: "app-ramadan",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    NzIconModule,
    NzButtonModule,
    NzRateModule,
    OptimizedImageComponent,
  ],
  templateUrl: "./ramadan.component.html",
  styleUrls: ["./ramadan.component.scss"],
})
export class RamadanComponent implements OnInit, OnDestroy {
  currentLang: "ar" | "en" = "ar";
  isLoading = true;
  sections: RamadanSection[] = [];
  private destroy$ = new Subject<void>();

  private readonly sectionDefinitions: Omit<RamadanSection, "apps">[] = [
    {
      id: "new-quran-apps",
      title_ar: "تطبيقات قرآنية جديدة",
      subtitle_ar: "تجارب حديثة تستحق التجربة والاكتشاف",
      description_ar:
        "يتجدد العمل التقني في خدمة القرآن باستمرار، وتظهر معه مبادرات وأفكار تضيف مساحات جديدة للتفاعل.\nتضم هذه المجموعة تطبيقات أُطلقت حديثًا أو شهدت تحديثات لافتة، لتمنحك فرصة اكتشاف تجارب تضيف بُعدًا مختلفًا لرحلتك مع القرآن في رمضان.",
      title_en: "New Quran Apps",
      subtitle_en: "Recent experiences worth exploring and discovering",
      description_en:
        "Technical work in service of the Quran is constantly renewed, with new initiatives and ideas adding fresh spaces for interaction.\nThis collection includes recently launched apps or those with notable updates, giving you the chance to discover experiences that add a different dimension to your journey with the Quran during Ramadan.",
      image: "assets/images/Maskgroup.svg",
      appSlugs: ["al-kitab", "tadabbur-quran", "fadhakkir"],
      appNamesAr: ["الكتاب", "تدبر القرآن", "فذكّر"],
    },
    {
      id: "ai-quran",
      title_ar: "الذكاء الاصطناعي والقرآن",
      subtitle_ar: "تجارب ذكية للفهم والتعلم",
      description_ar:
        "تفتح تقنيات الذكاء الاصطناعي آفاقًا جديدة في التفاعل مع النص القرآني.\nتضم هذه المجموعة تطبيقات توظّف هذه التقنيات لدعم الفهم والبحث والتعلّم، مقدمة تجربة أكثر تفاعلًا مع القرآن خلال رمضان.",
      title_en: "AI and the Quran",
      subtitle_en: "Smart experiences for understanding and learning",
      description_en:
        "AI technologies open new horizons in interacting with the Quranic text.\nThis collection includes apps that leverage these technologies for understanding, research, and learning.",
      image: "assets/images/Maskgroup2.svg",
      appSlugs: ["bahooth", "al-kitab", "11-tarteel"],
      appNamesAr: ["باحوث", "الكتاب", "ترتيل"],
    },
    {
      id: "family-ramadan",
      title_ar: "للأسرة في رمضان",
      subtitle_ar: "تجربة قرآنية ثرية للأطفال",
      description_ar:
        "رمضان فرصة لتقريب القرآن إلى قلوب أطفالك.\nتضم هذه المجموعة تطبيقات تعليمية تفاعلية مبسطة، تساعدك على منح أطفالك تجربة روحية مميزة خلال الشهر.",
      title_en: "Family in Ramadan",
      subtitle_en: "A rich Quranic experience for children",
      description_en:
        "Ramadan is an opportunity to bring the Quran closer to your children's hearts.\nThis collection includes simplified interactive educational apps for a special spiritual experience.",
      image: "assets/images/Maskgroup3.svg",
      appSlugs: ["10-adnan-the-quran-teacher", "6-rayyaan-bayaan", "67-salem"],
      appNamesAr: ["عدنان معلم القرآن", "ريان وبيان", "سالم"],
    },
    {
      id: "learn-quran",
      title_ar: "تعلم القرآن",
      subtitle_ar: "خطوات ثابتة للتعلم والتحسين بالتوجيه والمتابعة",
      description_ar:
        "في رحلتنا مع القرآن، نحتاج أحيانًا إلى من يوجّهنا ويعيننا على التصحيح والثبات.\nتضم هذه المجموعة تطبيقات تتيح التعلّم بمساندة معلم، لمتابعة القراءة، وتحسين الأداء، وبناء علاقة تعلّم أكثر رسوخًا خلال رمضان.",
      title_en: "Learn Quran",
      subtitle_en: "Steady steps for learning with guidance and follow-up",
      description_en:
        "In our journey with the Quran, we sometimes need guidance and support for correction and consistency.\nThis collection includes apps that enable learning with teacher support during Ramadan.",
      image: "assets/images/Maskgroup4.svg",
      appSlugs: ["14-quran-mobasher", "7-moddakir", "taahud"],
      appNamesAr: ["القرآن مباشر", "مُدَكر", "تعاهد"],
    },
    {
      id: "ramadan-tools",
      title_ar: "أدوات تعينك في رمضان",
      subtitle_ar: "تنظيم ومتابعة ورفقة عملية للشهر",
      description_ar:
        "مع تغيّر إيقاع الأيام في رمضان، نحتاج أحيانًا إلى وسائل بسيطة تعيننا على الاستمرار بثبات.\nتضم هذه المجموعة تطبيقات مساندة تساعدك على تنظيم وقتك مع القرآن، ومتابعة وردك، وتيسير الوصول إلى المحتوى القرآني بأساليب عملية.",
      title_en: "Tools for Ramadan",
      subtitle_en: "Organization, tracking, and practical support",
      description_en:
        "With the changing rhythm of Ramadan days, we sometimes need simple tools to help us stay consistent.\nThis collection includes supportive apps to help organize your Quran time and track your daily reading.",
      image: "assets/images/Maskgroup.svg",
      appSlugs: ["50-mofassal", "ameen", "ayna-wasalt"],
      appNamesAr: ["مفصل", "آمين", "أين وصلت"],
    },
    {
      id: "quran-translations",
      title_ar: "ترجمات القرآن في رمضان",
      subtitle_ar: "لتوصيل المعنى بلغات متعددة",
      description_ar:
        "يمتد أثر القرآن إلى قلوبٍ تنطق بلغاتٍ شتّى، ويظل المعنى حاضرًا وإن اختلف اللسان.\nتضم هذه المجموعة تطبيقات توفر ترجمات لمعاني القرآن، لتيسير الفهم والتدبر على غير الناطقين بالعربية.",
      title_en: "Quran Translations in Ramadan",
      subtitle_en: "Conveying meaning in multiple languages",
      description_en:
        "The impact of the Quran extends to hearts that speak many languages, and the meaning remains present regardless of tongue.\nThis collection includes apps that provide translations of the meanings of the Quran.",
      image: "assets/images/Maskgroup2.svg",
      appSlugs: [
        "57-noor-international-quran",
        "al-mukhtasar-fi-altafsir",
        "38-maanoni-da-shiriyar-alqurani",
      ],
      appNamesAr: [
        "مصحف نور إنترناشيونال",
        "المختصر في التفسير",
        "تفسير الهوسا",
      ],
    },
    {
      id: "quranic-recitations",
      title_ar: "الروايات القرآنية",
      subtitle_ar: "تنوع في التلاوة وأداء النص",
      description_ar:
        "يحمل القرآن في تعدد رواياته ثراءً في الأداء وجمالًا يتجدد مع اختلاف أوجه التلاوة.\nتضم هذه المجموعة تطبيقات تعرض المصحف وتلاواته وفق روايات قرآنية متعددة، لتيسير القراءة والاستماع بالرواية التي تفضلها.",
      title_en: "Quranic Recitations",
      subtitle_en: "Diversity in recitation and text delivery",
      description_en:
        "The Quran carries richness in its multiple recitations and beauty that renews with different modes of reading.\nThis collection includes apps that present the Mushaf and recitations in multiple Quranic narrations.",
      image: "assets/images/Maskgroup3.svg",
      appSlugs: [
        "70-quranic-recitations-collection",
        "mushaf-alqiraat",
        "48-mushaf-mecca",
      ],
      appNamesAr: ["جامع التلاوات القرآنية", "مصحف القراءات", "مصحف مكة"],
    },
    {
      id: "quran-in-ramadan",
      title_ar: "القرآن في رمضان",
      subtitle_ar: "رفقة يومية للتلاوة والتدبر والحفظ",
      description_ar:
        "يحظى القرآن في رمضان بحضور يومي منتظم في حياتنا، تتنوع معه أنماط القراءة والاستماع والتدبر.\nتضم هذه المجموعة تطبيقات تساعدك على قراءة القرآن، الاستماع إليه، تدبره، ومراجعته بأساليب مختلفة تناسب إيقاع الشهر.",
      title_en: "Quran in Ramadan",
      subtitle_en:
        "Daily companion for recitation, reflection and memorization",
      description_en:
        "The Quran has a special daily presence in our lives during Ramadan, with diverse modes of reading, listening, and reflection.\nThis collection includes apps to help you read, listen to, reflect upon, and review the Quran in ways that suit the rhythm of the month.",
      image: "assets/images/Maskgroup4.svg",
      appSlugs: ["1-wahy", "37-interactive-tafsir", "80-quran-tadabbur"],
      appNamesAr: ["وَحي", "التفسير التفاعلي", "القرآن الكريم تدبر وعمل"],
    },

    {
      id: "quran-accessibility",
      title_ar: "القرآن وإمكانية الوصول",
      subtitle_ar: "تجارب تراعي احتياجات الجميع",
      description_ar:
        "يبقى القرآن قريبًا من كل من يسعى إليه، مهما اختلفت احتياجاته وظروفه.\nتضم هذه المجموعة تطبيقات صُممت لمراعاة احتياجات ذوي الإعاقة البصرية أو السمعية، وتوفر تجارب استخدام ميسّرة تعين على القراءة والاستماع والتفاعل مع النص القرآني بسهولة.",
      title_en: "Quran Accessibility",
      subtitle_en: "Experiences that consider everyone's needs",
      description_en:
        "The Quran remains close to everyone who seeks it, regardless of their needs and circumstances.\nThis collection includes apps designed for visual or hearing impairments, providing accessible experiences.",
      image: "assets/images/Maskgroup1.svg",
      appSlugs: ["54-ana-atlou", "56-tebyan-quran", "al-qari"],
      appNamesAr: ["أنا أتلو", "مصحف تبيان للصم", "القارئ"],
    },
  ];

  constructor(
    private translateService: TranslateService,
    private apiService: ApiService,
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.sections = this.sectionDefinitions.map((def) => ({
      ...def,
      apps: [],
    }));
    this.currentLang = this.translateService.currentLang as "ar" | "en";

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.currentLang = event.lang as "ar" | "en";
        this.updateSeo();
      });

    this.loadData();
    this.updateSeo();

    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.add("ramadan-theme");
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.remove("ramadan-theme");
    }
  }

  private updateSeo(): void {
    const title =
      this.currentLang === "ar"
        ? "رمضان كريم - دليل التطبيقات القرآنية"
        : "Ramadan Kareem - Quran Apps Directory";
    const description =
      this.currentLang === "ar"
        ? "اكتشف أفضل التطبيقات القرآنية لشهر رمضان المبارك ١٤٤٧"
        : "Discover the best Quran apps for the blessed month of Ramadan 1447";

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: "description", content: description });
  }

  private loadData(): void {
    this.apiService
      .getApps()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const allApps = response.results || [];
          this.buildSections(allApps);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });

    this.apiService.getCategories().pipe(takeUntil(this.destroy$)).subscribe();
  }

  private buildSections(allApps: App[]): void {
    this.sections = this.sectionDefinitions.map((def) => {
      const apps = this.findApps(allApps, def.appSlugs, def.appNamesAr);
      return { ...def, apps };
    });
  }

  private findApps(allApps: App[], slugs: string[], namesAr: string[]): App[] {
    const matched: App[] = [];

    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i];
      const nameAr = namesAr[i];

      // Try matching by slug first
      let app = allApps.find((a) => a.slug === slug);

      // Fallback: match by Arabic name
      if (!app && nameAr) {
        app = allApps.find((a) => a.name_ar === nameAr);
      }

      if (app) {
        matched.push(app);
      }
    }

    return matched;
  }

  getSectionTitle(section: RamadanSection): string {
    return this.currentLang === "ar" ? section.title_ar : section.title_en;
  }

  getSectionSubtitle(section: RamadanSection): string {
    return this.currentLang === "ar"
      ? section.subtitle_ar
      : section.subtitle_en;
  }

  getSectionDescription(section: RamadanSection): string {
    return this.currentLang === "ar"
      ? section.description_ar
      : section.description_en;
  }

  getAppName(app: App): string {
    return this.currentLang === "ar" ? app.name_ar : app.name_en;
  }

  getAppDescription(app: App): string {
    return this.currentLang === "ar"
      ? app.short_description_ar
      : app.short_description_en;
  }

  isReversed(index: number): boolean {
    return index % 2 === 0;
  }
}
