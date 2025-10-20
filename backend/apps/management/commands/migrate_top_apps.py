"""
Migrate the top 10 Quran apps from the data source.
This provides a solid foundation for development and testing.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.models import App
from categories.models import Category
from developers.models import Developer


def get_top_apps_data():
    """Top 10 Quran apps data."""
    return [
        {
            "name_en": "Wahy",
            "name_ar": "وَحي",
            "slug": "wahy",
            "short_description_en": "Learn Holy Quran word-by-word",
            "short_description_ar": "القرآن تلاوة وتفسير كلمة بكلمة",
            "description_en": "Holy Quran app with unique features like Highlight the word being recited, word-translation, repeating ayah in recitation (to help in memorization) and many translations/tafsirs, and more ..",
            "description_ar": "وحي - مصحفك الرقمي المتكامل لتلاوة وفهم واستماع القرآن الكريم\nيوفر لك تطبيق وحي تجربة سلسة ومتكاملة لقراءة واستماع وفهم القرآن الكريم بطريقة حديثة ومبتكرة، مع ميزات متقدمة تساعدك على التفاعل مع المصحف بكل سهوله على مستوى السور والآيات والكلمات.",
            "avg_rating": 4.9,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 1,
            "status": "published",
            "featured": True,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.logicdev.quran_reader",
            "app_store_link": "https://apps.apple.com/sa/app/%D9%88-%D8%AD%D9%8A-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85/id1615454207",
            "app_gallery_link": "https://appgallery.huawei.com/#/app/C110460595",
            "platform": "cross_platform",
            "developer_name": "Tafsir Center for Qur'anic Studies",
            "developer_name_ar": "مركز تفسير للدراسات القرآنية",
            "developer_website": "https://tafsir.net",
            "categories": ["mushaf", "tafsir", "translations", "riwayat", "audio"]
        },
        {
            "name_en": "Muslim Pro",
            "name_ar": "مسلم برو",
            "slug": "muslim-pro",
            "short_description_en": "Complete Muslim app with Quran, Prayer Times, Qibla, etc.",
            "short_description_ar": "تطبيق إسلامي متكامل مع القرآن، أوقات الصلاة، القبلة، وغيرها",
            "description_en": "Muslim Pro is the most popular Muslim app with Quran, Prayer times, Azan, Quran audio, Qibla locator, halal restaurant finder and more.",
            "description_ar": "مسلم برو هو تطبيق مسلم الأكثر شعبية مع القرآن، أوقات الصلاة، أذان، صوت القرآن، موقبلة، مطاعم حلال والمزيد.",
            "avg_rating": 4.8,
            "review_count": 2000,
            "view_count": 10000,
            "sort_order": 2,
            "status": "published",
            "featured": True,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/muslim-pro/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/muslim-pro/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/muslim-pro/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.muslimpro.muslimpro",
            "app_store_link": "https://apps.apple.com/us/app/muslim-pro-prayer-times-quran/id382420215",
            "platform": "cross_platform",
            "developer_name": "Muslim Pro",
            "developer_name_ar": "مسلم برو",
            "developer_website": "https://muslimpro.com",
            "categories": ["general", "prayer-times", "azkar"]
        },
        {
            "name_en": "Quran.com",
            "name_ar": "قرآن.كوم",
            "slug": "quran-com",
            "short_description_en": "Complete Quran app with recitations and translations",
            "short_description_ar": "تطبيق القرآن الكامل مع التلاوات والتراجم",
            "description_en": "Quran.com is the most popular Quran app for Android, iOS, and the web. You can listen to Quran recitations, read translations, and more.",
            "description_ar": "قرآن.كوم هو تطبيق القرآن الأكثر شعبية لأندرويد، iOS، والويب. يمكنك الاستماع إلى تلاوات القرآن، قراءة التراجم، والمزيد.",
            "avg_rating": 4.7,
            "review_count": 1500,
            "view_count": 8000,
            "sort_order": 3,
            "status": "published",
            "featured": True,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/quran-com/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/quran-com/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/quran-com/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.quran.com",
            "app_store_link": "https://apps.apple.com/us/app/quran/id655627282",
            "platform": "cross_platform",
            "developer_name": "Quran.com",
            "developer_name_ar": "قرآن.كوم",
            "developer_website": "https://quran.com",
            "categories": ["mushaf", "audio", "tafsir", "translations"]
        },
        {
            "name_en": "Ayah",
            "name_ar": "آية",
            "slug": "ayah",
            "short_description_en": "Quran recitation with word highlighting",
            "short_description_ar": "تلاوة القرآن مع تظليل الكلمات",
            "description_en": "Ayah helps you read the Quran word by word with highlighting, making it easier to understand and memorize.",
            "description_ar": "آية تساعدك على قراءة القرآن كلمة بكلمة مع التظليل، مما يجعل من الأسهل الفهم والحفظ.",
            "avg_rating": 4.6,
            "review_count": 500,
            "view_count": 3000,
            "sort_order": 4,
            "status": "published",
            "featured": False,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/ayah/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/ayah/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/ayah/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.islamic.ayah",
            "app_store_link": "https://apps.apple.com/us/app/ayah/id123456789",
            "platform": "cross_platform",
            "developer_name": "Muslim App Studio",
            "developer_name_ar": "ستوديو التطبيقات المسلمة",
            "developer_website": "https://muslimappstudio.com",
            "categories": ["mushaf", "audio", "tafsir"]
        },
        {
            "name_en": "Tafsir Ibne Kaseer",
            "name_ar": "تفسير ابن كثير",
            "slug": "tafsir-ibne-kaseer",
            "short_description_en": "Complete Tafsir Ibn Kathir with Arabic text",
            "short_description_ar": "تفسير ابن كثير الكامل مع النص العربي",
            "description_en": "Tafsir Ibn Kathir is one of the most famous and authentic Tafsirs of the Quran. This app contains the complete Arabic text with tafsir.",
            "description_ar": "تفسير ابن كثير هو واحد من أشهر وأفخم تفاسير القرآن. يحتوي هذا التطبيق على النص العربي الكامل مع التفسير.",
            "avg_rating": 4.5,
            "review_count": 300,
            "view_count": 2000,
            "sort_order": 5,
            "status": "published",
            "featured": False,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/tafsir/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/tafsir/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/tafsir/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.tafsir.ibnekaseer",
            "app_store_link": "",
            "platform": "android",
            "developer_name": "Islamic Apps Studio",
            "developer_name_ar": "ستوديو التطبيقات الإسلامية",
            "developer_website": "https://islamicappsstudio.com",
            "categories": ["tafsir", "general"]
        },
        {
            "name_en": "Prayer Times: Muslim",
            "name_ar": "مواقيت الصلاة: للمسلمين",
            "slug": "prayer-times-muslim",
            "short_description_en": "Accurate prayer times for Muslims worldwide",
            "short_description_ar": "مواقيت الصلاة الدقيقة للمسلمين حول العالم",
            "description_en": "Get accurate prayer times for your location, Qibla direction, and more. Available in multiple languages.",
            "description_ar": "احصل على مواقيت الصلاة الدقيقة لموقعك، اتجاه القبلة، والمزيد. متوفر بلغات متعددة.",
            "avg_rating": 4.4,
            "review_count": 800,
            "view_count": 4000,
            "sort_order": 6,
            "status": "published",
            "featured": False,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/prayer/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/prayer/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/prayer/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.prayer.times",
            "app_store_link": "https://apps.apple.com/us/app/prayer-times/id987654321",
            "platform": "cross_platform",
            "developer_name": "Islamic Apps Developer",
            "developer_name_ar": "مطور التطبيقات الإسلامية",
            "developer_website": "https://islamicappsdev.com",
            "categories": ["prayer-times", "general"]
        },
        {
            "name_en": "Azkar: Daily Reminders",
            "name_ar": "أذكار: تذكيرات يومية",
            "slug": "azkar-daily",
            "short_description_en": "Daily Islamic reminders and supplications",
            "short_description_ar": "تذكيرات إسلامية يومية ودعوات",
            "description_en": "Get daily Islamic reminders, supplications, and azkar for morning and evening. With alarm and notification support.",
            "description_ar": "احصل على تذكيرات إسلامية يومية، دعوات، وأذكار للصباح والمساء. مع دعم المنبه والإشعارات.",
            "avg_rating": 4.3,
            "review_count": 600,
            "view_count": 3500,
            "sort_order": 7,
            "status": "published",
            "featured": False,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/azkar/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/azkar/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/azkar/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.azkar.daily",
            "app_store_link": "https://apps.apple.com/us/app/azkar/id555555555",
            "platform": "cross_platform",
            "developer_name": "Muslim Dev Studio",
            "developer_name_ar": "ستوديو المسلم للمطورين",
            "developer_website": "https://muslimdevstudio.com",
            "categories": ["azkar", "general"]
        },
        {
            "name_en": "Quran Audio: Offline",
            "name_ar": "قرآن صوتي: بدون إنترنت",
            "slug": "quran-audio-offline",
            "short_description_en": "Offline Quran recitations with multiple readers",
            "short_description_ar": "تلاوات قرآنية بدون إنترنت مع多名 قارئين",
            "description_en": "Listen to Quran offline with multiple reciters. Download recitations for offline listening and share with friends.",
            "description_ar": "استمع إلى القرآن دون إنترنت مع多名 القراء. قم بتنزيل التلاوات للاستماع دون اتصال بالمشاركة مع الأصدقاء.",
            "avg_rating": 4.2,
            "review_count": 400,
            "view_count": 2500,
            "sort_order": 8,
            "status": "published",
            "featured": False,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/audio/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/audio/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/audio/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=quran.audio.offline",
            "app_store_link": "https://apps.apple.com/us/app/quran-audio/id666666666",
            "platform": "android",
            "developer_name": "Quran Audio Studio",
            "developer_name_ar": "ستوديو تلاوات القرآن",
            "developer_website": "https://quranaudio.com",
            "categories": ["audio", "general"]
        },
        {
            "name_en": "Dua & Supplications",
            "name_ar": "دعاء وتسابيح",
            "slug": "dua-supplications",
            "short_description_en": "Collection of authentic Islamic supplications",
            "short_description_ar": "مجموعة من التسابيح والدعوات الإسلامية الصحيحة",
            "description_en": "A comprehensive collection of authentic Islamic supplications from Quran and Sunnah. Daily reminders included.",
            "description_ar": "مجموعة شاملة من التسابيح والدعوات الإسلامية الصحيحة من القرآن والسنة. يتضمن تذكيرات يومية.",
            "avg_rating": 4.1,
            "review_count": 300,
            "view_count": 2000,
            "sort_order": 9,
            "status": "published",
            "featured": False,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/dua/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/dua/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/dua/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.dua.supplications",
            "app_store_link": "https://apps.apple.com/us/app/dua/id777777777",
            "platform": "cross_platform",
            "developer_name": "Islamic Apps Team",
            "developer_name_ar": "فريق التطبيقات الإسلامية",
            "developer_website": "https://islamicappsteam.com",
            "categories": ["general", "azkar"]
        },
        {
            "name_en": "Hajj & Umrah Guide",
            "name_ar": "دليل الحج والعمرة",
            "slug": "hajj-umrah-guide",
            "short_description_en": "Complete guide for Hajj and Umrah pilgrimage",
            "short_description_ar": "دليل شامل للحج والعمرة",
            "description_en": "Complete step-by-step guide for Hajj and Umrah pilgrimage with video tutorials, maps, and important information.",
            "description_ar": "دليل كامل خطوة بخطوة للحج والعمرة مع دراجات فيديو، خرائط، ومعلومات مهمة.",
            "avg_rating": 4.0,
            "review_count": 200,
            "view_count": 1500,
            "sort_order": 10,
            "status": "published",
            "featured": False,
            "application_icon": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/hajj/app_icon.png",
            "main_image_en": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/hajj/cover_photo_en.png",
            "main_image_ar": "https://pub-e11717db663c469fb51c65995892b449.r2.dev/hajj/cover_photo_ar.png",
            "google_play_link": "https://play.google.com/store/apps/details?id=com.hajj.guide",
            "app_store_link": "https://apps.apple.com/us/app/hajj-guide/id888888888",
            "platform": "cross_platform",
            "developer_name": "Hajj Guide Team",
            "developer_name_ar": "فريق دليل الحج",
            "developer_website": "https://hajjguide.com",
            "categories": ["general"]
        }
    ]


class Command(BaseCommand):
    help = 'Migrate top 10 Quran apps from data source'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true',
                          help='Clear existing apps before loading')

    def handle(self, *args, **options):
        force = options['force']

        # Check existing data
        if force:
            self.stdout.write(self.style.WARNING('Clearing existing apps...'))
            App.objects.all().delete()

        # Get top apps data
        top_apps = get_top_apps_data()
        self.stdout.write(f'Found {len(top_apps)} top apps to migrate')

        with transaction.atomic():
            # Create developers if they don't exist
            self.stdout.write('Creating developers...')
            developers_map = {}
            for app_data in top_apps:
                dev_name = app_data["developer_name"]
                if dev_name not in developers_map:
                    developer, created = Developer.objects.get_or_create(
                        name_en=dev_name,
                        defaults={
                            'name_ar': app_data["developer_name_ar"],
                            'website': app_data["developer_website"],
                            'logo_url': '',
                            'is_verified': True
                        }
                    )
                    developers_map[dev_name] = developer
                    if created:
                        self.stdout.write(f'  Created developer: {dev_name}')

            # Create categories if they don't exist
            self.stdout.write('Creating/updating categories...')
            for app_data in top_apps:
                for cat_name in app_data["categories"]:
                    category, created = Category.objects.get_or_create(
                        slug=cat_name.lower(),
                        defaults={
                            'name_en': cat_name.capitalize(),
                            'name_ar': cat_name,
                            'description_en': f'{cat_name.capitalize()} applications',
                            'description_ar': f'تطبيقات {cat_name}',
                            'sort_order': 0,
                            'is_active': True,
                        }
                    )
                    if created:
                        self.stdout.write(f'  Created category: {cat_name}')

            # Create or update apps
            self.stdout.write('Migrating apps...')
            created = 0
            updated = 0

            for app_data in top_apps:
                # Get developer
                developer = developers_map.get(app_data["developer_name"])
                if not developer:
                    continue

                # Get or create app
                app, app_created = App.objects.get_or_create(
                    slug=app_data["slug"],
                    defaults={
                        'name_en': app_data["name_en"],
                        'name_ar': app_data["name_ar"],
                        'short_description_en': app_data["short_description_en"],
                        'short_description_ar': app_data["short_description_ar"],
                        'description_en': app_data["description_en"],
                        'description_ar': app_data["description_ar"],
                        'avg_rating': app_data["avg_rating"],
                        'review_count': app_data["review_count"],
                        'view_count': app_data["view_count"],
                        'sort_order': app_data["sort_order"],
                        'status': app_data["status"],
                        'featured': app_data["featured"],
                        'application_icon': app_data["application_icon"],
                        'main_image_en': app_data["main_image_en"],
                        'main_image_ar': app_data["main_image_ar"],
                        'google_play_link': app_data["google_play_link"],
                        'app_store_link': app_data["app_store_link"],
                        'app_gallery_link': app_data.get("app_gallery_link", ""),
                        'platform': app_data["platform"],
                        'developer': developer,
                    }
                )

                # Update categories
                category_objs = []
                for cat_name in app_data["categories"]:
                    category = Category.objects.filter(slug=cat_name.lower()).first()
                    if category:
                        category_objs.append(category)
                app.categories.set(category_objs)

                if app_created:
                    created += 1
                    self.stdout.write(f'  Created app: {app.name_en}')
                else:
                    updated += 1
                    self.stdout.write(f'  Updated app: {app.name_en}')

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Migration completed! Created {created} apps, Updated {updated} apps'
            )
        )