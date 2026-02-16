"""
Data migration to add Surah app by Al-Burhan Association.

This migration adds the Surah app to the directory. The app was requested
by Al-Burhan Association who already has Maher and Salem apps in the directory.
"""
from django.db import migrations
from decimal import Decimal


def add_surah_app(apps, schema_editor):
    """Add Surah app by Al-Burhan Association."""
    App = apps.get_model('apps', 'App')
    Developer = apps.get_model('developers', 'Developer')
    Category = apps.get_model('categories', 'Category')

    print("\n=== Adding Surah App ===")

    # Skip if already exists (idempotent)
    if App.objects.filter(slug='surah').exists():
        print("  ℹ️  Surah app already exists, skipping")
        return

    # Get or create Al-Burhan developer (already exists from Maher/Salem apps)
    developer, created = Developer.objects.get_or_create(
        name_en='AL BORHAN CHARITY FOR SUNNAH & QURAN SERVICES',
        defaults={
            'name_ar': 'جمعية البرهان لخدمة السنة والقرآن',
            'website': 'https://www.alborhan.sa',
            'logo_url': 'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/developer_logo.png',
        }
    )
    if created:
        print(f"  ✅ Created developer: {developer.name_en}")
    else:
        print(f"  ℹ️  Using existing developer: {developer.name_en}")

    # Create Surah app with full data
    app = App.objects.create(
        slug='surah',
        name_en='Surah',
        name_ar='سورة',
        short_description_en='Noble Quran with Tafsir',
        short_description_ar='مصحف رقمي موثوق مع التفسير',
        description_en='''Surah app combines Quranic study with authentic tafsir, clear Uthmani script, and an elegant user-friendly interface. Supervised by the Tafsir Center for Quranic Studies, it serves as a trusted digital companion for every Muslim who seeks to read and reflect on the Word of Allah offline.

Key Features:
- Complete Quran with high-resolution Uthmani pages - works offline
- Scholar-reviewed Tafsir and translations in multiple languages
- Over 60 world-renowned reciters available offline
- Interactive memorization plans with smart reminders and self-testing
- Night mode for comfortable reading
- Advanced word and voice search capabilities
- Completely ad-free experience
- Add bookmarks and notes on verses
- Smart index to navigate surahs, juz', and pages easily''',
        description_ar='''تطبيق سورة أحد مبادرات مركز تفسير للدراسات القرآنية، وهو نسخة رقمية من المصحف الشريف.

مميزات التطبيق:
- القرآن الكريم كاملاً بدون إنترنت مع صفحات عالية الدقة بالرسم العثماني
- تفسير موثق بإشراف مركز تفسير للدراسات القرآنية
- أكثر من 60 قارئاً للاستماع بدون إنترنت
- أدوات الحفظ مع خطط تفاعلية وتذكيرات ذكية
- الوضع الليلي لقراءة مريحة
- بحث متقدم بالكلمة والصوت
- تجربة خالية من الإعلانات
- إضافة الفواصل والملاحظات على الآيات
- فهرس ذكي للتنقل بين السور والأجزاء والصفحات''',
        application_icon='https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/app_icon.png',
        main_image_en='https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/cover_photo_ar.png',
        main_image_ar='https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/cover_photo_ar.png',
        screenshots_en=[
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/01_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/02_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/03_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/04_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/05_screenshots_ar.png',
        ],
        screenshots_ar=[
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/01_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/02_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/03_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/04_screenshots_ar.png',
            'https://pub-e11717db663c469fb51c65995892b449.r2.dev/Surah/05_screenshots_ar.png',
        ],
        google_play_link='https://play.google.com/store/apps/details?id=com.surahapp',
        app_store_link='https://apps.apple.com/us/app/surah-al-quran/id1615829761',
        app_gallery_link='',
        avg_rating=Decimal('4.80'),
        sort_order=45,
        status='published',
        platform='cross_platform',
        developer=developer,
    )

    # Assign categories
    category_slugs = ['mushaf', 'tafsir', 'audio', 'memorize']
    categories = Category.objects.filter(slug__in=category_slugs)
    app.categories.set(categories)

    assigned_cats = list(categories.values_list('slug', flat=True))
    print(f"  ✅ Created: {app.name_en} / {app.name_ar} (slug: {app.slug})")
    print(f"  ✅ Assigned categories: {assigned_cats}")
    print("=== Done ===\n")


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0010_fix_truncated_descriptions'),
        ('developers', '0001_initial'),
        ('categories', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_surah_app, migrations.RunPython.noop),
    ]
