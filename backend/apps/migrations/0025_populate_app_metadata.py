# Generated manually - Populate AppMetadataValue for all apps
# Best-effort inference from app titles, descriptions, and categories.
# Idempotent: uses get_or_create. Refine via Django admin after.

from django.db import migrations


# Metadata assignments inferred from app title + description + short description.
# Format: {slug: {metadata_type_name: [option_values]}}
APP_METADATA = {
    # Wahy - Learn word-by-word, Quran learning app
    '1-wahy': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['audio', 'memorization', 'bookmarks'],
    },
    # Ayah - Quran app
    '15-ayah': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['audio', 'bookmarks', 'search'],
    },
    # Quran Mobasher - Teaching Quran anytime, anywhere
    '14-quran mobasher': {
        'riwayah': ['hafs'],
        'features': ['audio', 'offline'],
    },
    # Adnan The Quran Teacher - Interactive for children, memorize full Quran
    '10-adnan the quran teacher': {
        'riwayah': ['hafs'],
        'features': ['audio', 'memorization'],
    },
    # Al Fatiha - Teaching Al-Fatihah Online
    '17-al fatiha': {
        'riwayah': ['hafs'],
        'features': ['audio', 'tajweed'],
    },
    # Quran - from Quran.com
    '5-quran': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani', 'madani', 'indo_pak'],
        'features': ['audio', 'translation', 'tafsir', 'bookmarks', 'search', 'offline', 'dark_mode'],
    },
    # Mushaf Altdabbor - Tadabbur (reflection)
    '36-mushaf altdabbor': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['tafsir', 'bookmarks'],
    },
    # Tarteel - AI Quran mistake detection
    '11-tarteel': {
        'riwayah': ['hafs'],
        'features': ['audio', 'memorization', 'search', 'offline'],
    },
    # Rayyaan & Bayaan - Help children memorize Quran
    '6-rayyaan & bayaan': {
        'riwayah': ['hafs'],
        'features': ['audio', 'memorization'],
    },
    # Ayah Widget - Quran verse widget
    '39-ayah widget': {
        'riwayah': ['hafs'],
        'features': ['notifications'],
    },
    # Mushaf Mecca - Essential Quran app
    '48-mushaf mecca': {
        'riwayah': ['hafs'],
        'mushaf_type': ['madani'],
        'features': ['audio', 'tafsir', 'bookmarks', 'search'],
    },
    # Maher - Live recitation recognition
    '9-maher': {
        'riwayah': ['hafs'],
        'features': ['audio', 'memorization'],
    },
    # Elmohafez - Companion in memorizing Quran
    '49-elmohafez': {
        'riwayah': ['hafs'],
        'features': ['audio', 'memorization', 'tajweed'],
    },
    # Moddakir - Teaching Quran
    '7-moddakir': {
        'riwayah': ['hafs'],
        'features': ['audio', 'memorization'],
    },
    # MA'ANONI - Hausa Tafsir
    "38-ma'anoni da shiriyar alqur'ani": {
        'riwayah': ['hafs'],
        'features': ['audio', 'tafsir', 'translation'],
    },
    # Mofassal - Create Quranic Plans
    '50-mofassal': {
        'riwayah': ['hafs'],
        'features': ['bookmarks', 'memorization'],
    },
    # The Correct Quotation - Quran Keyboard
    '51-the correct quotation': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['search'],
    },
    # Satr - Innovative flexible recitation
    '52-satr': {
        'riwayah': ['hafs'],
        'features': ['memorization'],
    },
    # Moeen - Mushaf review
    '53-moeen': {
        'riwayah': ['hafs'],
        'mushaf_type': ['madani'],
        'features': ['memorization', 'bookmarks'],
    },
    # Quran Tadabbur - Quran reflection and action
    '80-quran tadabbur': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['tafsir', 'bookmarks'],
    },
    # Translations of Quran meanings - Quran Encyclopedia
    '69-translations of quran meanings': {
        'riwayah': ['hafs'],
        'features': ['translation', 'search', 'audio'],
    },
    # Ana Atlou - Digital audio Quran for visually impaired
    '54-ana atlou': {
        'riwayah': ['hafs'],
        'features': ['audio', 'offline'],
    },
    # Alfanous - Advanced Quranic search engine
    '55-alfanous': {
        'features': ['search', 'translation'],
    },
    # Noor International Quran - Most reliable translations
    '57-noor international quran': {
        'riwayah': ['hafs'],
        'features': ['translation', 'audio'],
    },
    # Werdy - Companion for khatm, for those who prefer paper mushaf
    '58-werdy': {
        'riwayah': ['hafs'],
        'features': ['bookmarks', 'notifications'],
    },
    # Interactive Tafsir - Read and listen to interpretations
    '37-interactive tafsir': {
        'riwayah': ['hafs'],
        'features': ['tafsir', 'audio'],
    },
    # School Mushaf - Curriculum-based recitation and memorization
    '59-school mushaf': {
        'riwayah': ['hafs'],
        'mushaf_type': ['madani'],
        'features': ['audio', 'memorization'],
    },
    # School Mushaf Sign Language - Quran for deaf students
    '60-school mushaf - sign language': {
        'riwayah': ['hafs'],
        'mushaf_type': ['madani'],
        'features': ['audio'],
    },
    # Quran Hafs - King Fahd Complex
    '23-quran hafs': {
        'riwayah': ['hafs'],
        'mushaf_type': ['madani'],
        'features': ['audio', 'bookmarks', 'search', 'offline'],
    },
    # Tangheem Al Quran - 31 Quranic linguistic styles
    '65-tangheem al quran': {
        'riwayah': ['hafs'],
        'features': ['audio', 'tajweed'],
    },
    # Tebyan Quran - Interactive Quran for deaf with sign language
    '56-tebyan quran': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['audio'],
    },
    # Quran Warsh - King Fahd Complex, Warsh narration
    '62-quran warsh': {
        'riwayah': ['warsh'],
        'mushaf_type': ['madani'],
        'features': ['audio', 'bookmarks', 'search', 'offline'],
    },
    # Quranic Recitations Collection - 900+ reciters
    '70-quranic recitations collection': {
        'riwayah': ['hafs', 'warsh', 'qalun', 'shubah', 'alduri', 'alsusi', 'other'],
        'features': ['audio', 'offline', 'search'],
    },
    # Kaedat Alnoor - Noorani Qaida and Arabic alphabet
    '64-kaedat alnoor': {
        'features': ['audio', 'tajweed'],
    },
    # Amazighi Quran - Muhammadi Mushaf, Warsh narration
    '81-amazighi quran': {
        'riwayah': ['warsh'],
        'mushaf_type': ['moroccan'],
        'features': ['audio', 'translation', 'offline'],
    },
    # Quran Indonesia Kemenag - Comprehensive Quran app
    '82-quran indonesia kemenag koran': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['audio', 'translation', 'tafsir', 'bookmarks', 'offline'],
    },
    # Convey - Spread Allah's Book
    '47-convey': {
        'riwayah': ['hafs'],
        'features': ['audio', 'translation'],
    },
    # Salem - Arabic letters and Al-Fatihah
    '67-salem': {
        'riwayah': ['hafs'],
        'features': ['audio'],
    },
    # Telawa Warsh - Quran narrated by Warsh from Nafi
    '83-telawa warsh': {
        'riwayah': ['warsh'],
        'mushaf_type': ['moroccan'],
        'features': ['audio', 'offline'],
    },
    # Wiqaya - Tajweed, correcting pronunciation
    '63-wiqaya': {
        'riwayah': ['hafs'],
        'features': ['tajweed', 'audio'],
    },
    # Study Quran - Interactive digital Mushaf
    '35-study quran': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['audio', 'tafsir', 'bookmarks', 'search'],
    },
    # The Holy Quran - Quran in Virtual Reality
    '13-the holy quran': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani'],
        'features': ['audio'],
    },
    # Ghareeb - Learn Quran meanings, easy and fun for all ages
    '41-ghareeb': {
        'riwayah': ['hafs'],
        'features': ['tafsir'],
    },
    # Ehfaz Al Quran - Memorization using Louh method
    '61-ehfaz al quran': {
        'riwayah': ['hafs'],
        'features': ['memorization', 'audio'],
    },
    # Surah - Comprehensive Quran app
    'surah': {
        'riwayah': ['hafs'],
        'mushaf_type': ['uthmani', 'madani'],
        'features': ['audio', 'tafsir', 'translation', 'bookmarks', 'search', 'offline', 'dark_mode'],
    },
}


def populate_metadata(apps, schema_editor):
    """
    Assign metadata (riwayah, mushaf_type, features) to all apps.
    Uses get_or_create so it is idempotent - safe to run multiple times.
    """
    App = apps.get_model('apps', 'App')
    MetadataOption = apps.get_model('metadata', 'MetadataOption')
    AppMetadataValue = apps.get_model('metadata', 'AppMetadataValue')

    # Pre-fetch all metadata options into a lookup: (type_name, value) -> option
    options_lookup = {}
    for opt in MetadataOption.objects.select_related('metadata_type').all():
        key = (opt.metadata_type.name, opt.value)
        options_lookup[key] = opt

    created_total = 0
    skipped_total = 0

    for slug, type_values in APP_METADATA.items():
        app = App.objects.filter(slug=slug).first()
        if not app:
            print(f"  SKIP: App '{slug}' not found")
            continue

        for type_name, values in type_values.items():
            for value in values:
                option = options_lookup.get((type_name, value))
                if not option:
                    print(f"  WARN: Option '{type_name}:{value}' not found")
                    continue

                _, created = AppMetadataValue.objects.get_or_create(
                    app=app,
                    metadata_option=option,
                )
                if created:
                    created_total += 1
                else:
                    skipped_total += 1

    print(f"  Metadata populated: {created_total} created, {skipped_total} already existed")


def reverse_populate(apps, schema_editor):
    """Remove all metadata values for apps in APP_METADATA."""
    App = apps.get_model('apps', 'App')
    AppMetadataValue = apps.get_model('metadata', 'AppMetadataValue')

    slugs = list(APP_METADATA.keys())
    deleted = AppMetadataValue.objects.filter(app__slug__in=slugs).delete()[0]
    print(f"  Deleted {deleted} AppMetadataValue record(s)")


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0024_clear_broken_developer_logos'),
        ('metadata', '0004_seed_test_app_metadata'),
    ]

    operations = [
        migrations.RunPython(populate_metadata, reverse_populate),
    ]
