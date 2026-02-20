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
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Title, Meta } from "@angular/platform-browser";

export interface RamadanApp {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  short_description_ar: string;
  short_description_en: string;
  application_icon: string;
}

export interface RamadanSection {
  id: string;
  title_ar: string;
  subtitle_ar: string;
  description_ar: string;
  title_en: string;
  subtitle_en: string;
  description_en: string;
  image: string;
  apps: RamadanApp[];
}

@Component({
  selector: "app-ramadan",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
  ],
  templateUrl: "./ramadan.component.html",
  styleUrls: ["./ramadan.component.scss"],
})
export class RamadanComponent implements OnInit, OnDestroy {
  currentLang: "ar" | "en" = "ar";
  private destroy$ = new Subject<void>();

  readonly sections: RamadanSection[] = [
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
      apps: [
        {
          id: "82",
          slug: "alkitab",
          name_ar: "الكتاب",
          name_en: "AlKitab",
          short_description_ar: "مصحف ذكي ببحث متقدم",
          short_description_en: "Smart Mushaf with advanced search",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/alkitab/icon.webp",
        },
        {
          id: "84",
          slug: "tadabor-alquran",
          name_ar: "تدبر القرآن",
          name_en: "Tadabor AlQuran",
          short_description_ar: "تدبر آيات القرآن بأسلوب ممتع",
          short_description_en:
            "Reflect upon verses of Quran in engaging way",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/tadabor-alquran/icon.webp",
        },
        {
          id: "81",
          slug: "fazakir",
          name_ar: "فذكّر",
          name_en: "Fazakir",
          short_description_ar: "مصحف ومكتبة إسلامية متكاملة",
          short_description_en:
            "Integrated digital Mushaf and Islamic library",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/submissions/QAD-ZGXBP2/icon_a5424d8f.png",
        },
      ],
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
      apps: [
        {
          id: "48",
          slug: "bahouth",
          name_ar: "باحوث",
          name_en: "Bahouth",
          short_description_ar: "الباحث الذكي في النص القرآني",
          short_description_en: "Quran Smart Search Tool",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/bahouth/icon.webp",
        },
        {
          id: "82",
          slug: "alkitab",
          name_ar: "الكتاب",
          name_en: "AlKitab",
          short_description_ar: "مصحف ذكي ببحث متقدم",
          short_description_en: "Smart Mushaf with advanced search",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/alkitab/icon.webp",
        },
        {
          id: "8",
          slug: "11-tarteel",
          name_ar: "ترتيل",
          name_en: "Tarteel",
          short_description_ar:
            "حفظ ومراجعة تلاوة القرآن بالذكاء الاصطناعي",
          short_description_en:
            "Memorizing and reviewing Quranic recitation using AI",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/11_Tarteel/app_icon.png",
        },
      ],
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
      apps: [
        {
          id: "4",
          slug: "10-adnan-the-quran-teacher",
          name_ar: "عدنان معلم القرآن",
          name_en: "Adnan The Quran Teacher",
          short_description_ar:
            "تطبيق تفاعلي للأطفال لتعلم وحفظ القرآن",
          short_description_en:
            "Interactive app for kids to learn the Quran",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/10_Adnan The Quran Teacher/app_icon.png",
        },
        {
          id: "9",
          slug: "6-rayyaan-bayaan",
          name_ar: "ريان وبيان",
          name_en: "Rayyaan & Bayaan",
          short_description_ar: "تمكين الأطفال من تعلم القرآن الكريم",
          short_description_en:
            "Empowering children to learn the Holy Quran",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/6_Rayyaan & Bayaan/app_icon.png",
        },
        {
          id: "38",
          slug: "67-salem",
          name_ar: "سالم",
          name_en: "Salem",
          short_description_ar:
            "تطبيق تفاعلي لتعليم الأطفال الحروف وسورة الفاتحة",
          short_description_en:
            "Teaching children Arabic letters and Surah Al-Fatiha",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/67_Salem/app_icon.png",
        },
      ],
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
      apps: [
        {
          id: "3",
          slug: "14-quran-mobasher",
          name_ar: "القرآن مباشر",
          name_en: "Quran Mobasher",
          short_description_ar: "تصحيح تلاوة القرآن الكريم",
          short_description_en: "Correcting Quranic recitation",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/14_Quran Mobasher/app_icon.png",
        },
        {
          id: "14",
          slug: "7-moddakir",
          name_ar: "مُدَكر",
          name_en: "Moddakir",
          short_description_ar: "تعلم القرآن مع معلم مباشر",
          short_description_en: "Learn Quran with a live teacher",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/7_Moddakir/app_icon.png",
        },
        {
          id: "80",
          slug: "taahod",
          name_ar: "تعاهد",
          name_en: "Taahod",
          short_description_ar: "مجتمع تسميع ومراجعة القرآن",
          short_description_en:
            "Community for Quran recitation testing and revision",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/taahod/icon.webp",
        },
      ],
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
      apps: [
        {
          id: "16",
          slug: "50-mofassal",
          name_ar: "مفصل",
          name_en: "Mofassal",
          short_description_ar: "إدارة خطة حفظ القرآن الكريم",
          short_description_en: "Managing Quran Memorization Plan",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/50-mofassal/icon.webp",
        },
        {
          id: "60",
          slug: "ameen",
          name_ar: "آمين",
          name_en: "Ameen",
          short_description_ar:
            "المصحف والعبادات اليومية في مكان واحد",
          short_description_en:
            "Mushaf and daily acts of worship in one place",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/ameen/icon.webp",
        },
        {
          id: "52",
          slug: "where-am-i",
          name_ar: "أين وصلت",
          name_en: "Where am I",
          short_description_ar: "متابعة قراءة القرآن في المصحف",
          short_description_en:
            "Track Quran recitation progress in Mushaf",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/where-am-i/icon.webp",
        },
      ],
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
      apps: [
        {
          id: "24",
          slug: "57-noor-international-quran",
          name_ar: "مصحف نور إنترناشيونال",
          name_en: "Noor International Quran",
          short_description_ar:
            "ترجمات صوتية ونصية لمعاني القرآن",
          short_description_en:
            "Audio and text translations of the meanings of Quran",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/57_Noor International Quran/app_icon.png",
        },
        {
          id: "98",
          slug: "almukhtasar",
          name_ar: "المختصر في التفسير",
          name_en: "AlMukhtasar",
          short_description_ar: "تفسير القرآن بـ+40 لغة",
          short_description_en: "Quran Tafsir in +40 languages",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/almukhtasar/icon.webp",
        },
        {
          id: "15",
          slug: "38-maanoni-da-shiriyar-alqurani",
          name_ar: "تفسير الهوسا",
          name_en: "MA'ANONI DA SHIRIYAR ALQUR'ANI",
          short_description_ar: "تفسير القرآن بلغة الهوسا",
          short_description_en: "Quran tafsir in the Hausa language",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/38_MA'ANONI DA SHIRIYAR ALQUR'ANI/app_icon.png",
        },
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
      apps: [
        {
          id: "33",
          slug: "70-quranic-recitations-collection",
          name_ar: "جامع التلاوات القرآنية",
          name_en: "Quranic Recitations Collection",
          short_description_ar:
            "تلاوات القرآن الكريم بجميع الروايات",
          short_description_en:
            "Quranic recitations across all narrations",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/70_Quranic Recitations Collection/app_icon.png",
        },
        {
          id: "76",
          slug: "mushaf-al-qiraat",
          name_ar: "مصحف القراءات",
          name_en: "Mushaf Al-Qira'at",
          short_description_ar:
            "تعلم القراءات العشر والاختلاف بينها",
          short_description_en: "Learn the Ten Canonical Qiraat",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/mushaf-al-qiraat/icon.webp",
        },
        {
          id: "11",
          slug: "48-mushaf-mecca",
          name_ar: "مصحف مكة",
          name_en: "Mushaf Mecca",
          short_description_ar: "مصحف متكامل للقراءة والتدبر",
          short_description_en:
            "Comprehensive Mushaf for reading and reflection",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/48_Mushaf Mecca/app_icon.png",
        },
      ],
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
      apps: [
        {
          id: "1",
          slug: "1-wahy",
          name_ar: "وَحي",
          name_en: "Wahy",
          short_description_ar: "تطبيق شامل لتدبر القرآن",
          short_description_en:
            "Comprehensive app for Quran contemplation",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/app_icon.png",
        },
        {
          id: "26",
          slug: "37-interactive-tafsir",
          name_ar: "التفسير التفاعلي",
          name_en: "Interactive Tafsir",
          short_description_ar: "تفاسير القرآن قراءة واستماع",
          short_description_en:
            "Reading and listening to Quranic tafsir",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/37_Interactive Tafsir/app_icon.png",
        },
        {
          id: "20",
          slug: "80-quran-tadabbur",
          name_ar: "القرآن الكريم تدبر وعمل",
          name_en: "Quran: Reflect & Action",
          short_description_ar: "منهج عملي لتدبر القرآن",
          short_description_en:
            "Practical methodology for reflecting upon Quran",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/80_Quran Tadabbur/app_icon.png",
        },
      ],
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
      apps: [
        {
          id: "22",
          slug: "54-ana-atlou",
          name_ar: "أنا أتلو",
          name_en: "Ana Atlou",
          short_description_ar: "تطبيق قرآن صوتي للمكفوفين",
          short_description_en:
            "Audio-based Quran app for blind and visually impaired",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/54_Ana Atlou/app_icon.png",
        },
        {
          id: "31",
          slug: "56-tebyan-quran",
          name_ar: "مصحف تبيان للصم",
          name_en: "Tebyan Quran",
          short_description_ar:
            "مصحف بلغة الإشارة للصم وضعاف السمع",
          short_description_en: "Sign language Mushaf for the deaf",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/56_Tebyan Quran/app_icon.png",
        },
        {
          id: "67",
          slug: "alqarie",
          name_ar: "القارئ",
          name_en: "Alqarie",
          short_description_ar:
            "مصحف رقمي مسموع للمكفوفين وضعاف البصر",
          short_description_en:
            "Audio digital Mushaf for blind and visually impaired",
          application_icon:
            "https://pub-e11717db663c469fb51c65995892b449.r2.dev/app-icons/alqarie/icon.webp",
        },
      ],
    },
  ];

  constructor(
    private translateService: TranslateService,
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as "ar" | "en";

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.currentLang = event.lang as "ar" | "en";
        this.updateSeo();
      });

    this.updateSeo();

    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.add("ramadan-theme");
      window.scrollTo(0, 0);
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

  getAppName(app: RamadanApp): string {
    return this.currentLang === "ar" ? app.name_ar : app.name_en;
  }

  getAppDescription(app: RamadanApp): string {
    return this.currentLang === "ar"
      ? app.short_description_ar
      : app.short_description_en;
  }

  isReversed(index: number): boolean {
    return index % 2 === 0;
  }
}
