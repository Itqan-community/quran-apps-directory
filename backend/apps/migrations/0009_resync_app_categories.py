# Generated manually to resync app categories on all environments

from django.db import migrations


def resync_app_categories(apps, schema_editor):
    """
    Re-sync app categories based on frontend applicationsData.ts mapping.

    This migration ensures all apps have correct category assignments,
    fixing environments where migration 0003 ran before apps were populated.
    """
    App = apps.get_model('apps', 'App')
    Category = apps.get_model('categories', 'Category')

    # App-category mapping from frontend
    APP_CATEGORIES_MAP = {
        'Adnan The Quran Teacher': ['kids', 'memorize'],
        'Al Fatiha': ['recite'],
        'Alfanous': ['tools', 'tafsir'],
        'Amazighi Quran': ['riwayat', 'mushaf', 'tafsir', 'translations', 'audio'],
        'Ana Atlou': ['accessibility', 'mushaf', 'tafsir', 'translations'],
        'Ayah': ['mushaf', 'tafsir', 'translations'],
        'Ayah widget': ['tools'],
        'Convey': ['tools'],
        'Ehfaz Al Quran': ['memorize'],
        'Elmohafez': ['memorize', 'mushaf', 'riwayat', 'tafsir', 'translations', 'audio'],
        'Ghareeb': ['tools'],
        'Interactive Tafsir': ['tafsir'],
        'Kaedat Alnoor': ['tajweed'],
        "MA'ANONI DA SHIRIYAR ALQUR'ANI": ['translations', 'mushaf', 'tafsir'],
        'Maher': ['recite', 'mushaf', 'tafsir'],
        'Moddakir': ['recite', 'memorize'],
        'Moeen': ['memorize', 'mushaf'],
        'Mofassal': ['tools', 'memorize'],
        'Mushaf Altdabbor': ['tafsir', 'mushaf'],
        'Mushaf Mecca': ['mushaf', 'riwayat', 'tafsir', 'translations', 'audio'],
        'Noor International Quran': ['translations', 'mushaf', 'audio'],
        'Quran Hafs': ['mushaf', 'tafsir'],
        'Quran Indonesia Kemenag koran': ['translations', 'mushaf', 'tafsir'],
        'Quran Mobasher': ['recite', 'memorize'],
        'Quran Tadabbur': ['tafsir', 'mushaf'],
        'Quran Warsh': ['riwayat', 'mushaf', 'tafsir'],
        'Quranic Recitations Collection': ['audio', 'riwayat', 'translations'],
        'Rayyaan & Bayaan': ['kids', 'memorize'],
        'Salem': ['kids', 'memorize'],
        'Satr': ['tools', 'mushaf'],
        'School Mushaf': ['memorize', 'mushaf', 'kids'],
        'School Mushaf - Sign Language': ['accessibility', 'kids', 'memorize', 'mushaf'],
        'Study Quran': ['tafsir', 'mushaf'],
        'Tangheem Al Quran': ['tajweed'],
        'Tarteel': ['recite', 'memorize', 'translations', 'tafsir'],
        'Tebyan Quran': ['accessibility', 'mushaf', 'tafsir'],
        'Telawa Warsh': ['riwayat', 'mushaf', 'tafsir', 'translations'],
        'The Correct Quotation': ['tools'],
        'The Holy Quran': ['mushaf', 'tools'],
        'Translations of Quran meanings': ['translations'],
        'Wahy': ['mushaf', 'tafsir', 'translations', 'riwayat', 'audio'],
        'Werdy': ['tools'],
        'Wiqaya': ['tajweed', 'mushaf'],
        'Quran': ['mushaf'],
        'Quran Reader': ['mushaf', 'translations', 'recite', 'tafsir'],
    }

    updated_count = 0
    notfound_count = 0

    print("\n=== Re-syncing App Categories ===")

    for app_name, category_slugs in APP_CATEGORIES_MAP.items():
        try:
            app = App.objects.filter(name_en__iexact=app_name).first()

            if not app:
                notfound_count += 1
                continue

            categories = []
            for slug in category_slugs:
                category = Category.objects.filter(slug=slug).first()
                if category:
                    categories.append(category)

            if categories:
                app.categories.set(categories)
                category_names = ', '.join([c.name_en for c in categories])
                print(f"  ✅ {app.name_en}: {category_names}")
                updated_count += 1

        except Exception as e:
            print(f"  ❌ Error: {app_name}: {e}")

    # Assign default mushaf category to unmapped apps
    mapped_names = list(APP_CATEGORIES_MAP.keys())
    unmapped_apps = App.objects.exclude(name_en__in=mapped_names)

    mushaf = Category.objects.filter(slug='mushaf').first()
    if mushaf:
        for app in unmapped_apps:
            if not app.categories.exists():
                app.categories.set([mushaf])
                print(f"  ➡️  Default (mushaf): {app.name_en}")
                updated_count += 1

    print(f"\n✅ Re-sync completed! Updated: {updated_count}, Not found: {notfound_count}\n")


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0008_migrate_crawled_content'),
        ('categories', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(resync_app_categories, migrations.RunPython.noop),
    ]
