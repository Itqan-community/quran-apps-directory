# Generated manually for Multi-Filter API Support
# Migration 0002: Seed MetadataType and MetadataOption with existing filter data

from django.db import migrations


def seed_metadata(apps, schema_editor):
    """
    Populate metadata types and options based on existing App model enums.

    This seeds the following metadata types:
    - riwayah: 11 Quranic recitation styles
    - mushaf_type: 7 Mushaf types
    - features: 12 app features
    """
    MetadataType = apps.get_model('metadata', 'MetadataType')
    MetadataOption = apps.get_model('metadata', 'MetadataOption')

    # =============================================================================
    # RIWAYAH (Quranic Recitation Styles)
    # =============================================================================
    riwayah_type = MetadataType.objects.create(
        name='riwayah',
        label_en='Riwayah',
        label_ar='الرواية',
        description_en='Quranic recitation style (method of recitation)',
        description_ar='رواية القرآن الكريم (طريقة التلاوة)',
        is_multi_select=True,
        sort_order=1,
        is_active=True,
    )

    riwayah_options = [
        ('hafs', 'Hafs', 'حفص', 1),
        ('warsh', 'Warsh', 'ورش', 2),
        ('qalun', 'Qalun', 'قالون', 3),
        ('shubah', "Shu'bah", 'شعبة', 4),
        ('alduri', 'Al-Duri', 'الدوري', 5),
        ('alsusi', 'Al-Susi', 'السوسي', 6),
        ('hisham', 'Hisham', 'هشام', 7),
        ('ibn_dhakwan', 'Ibn Dhakwan', 'ابن ذكوان', 8),
        ('khalaf', 'Khalaf', 'خلف', 9),
        ('khallad', 'Khallad', 'خلاد', 10),
        ('other', 'Other', 'أخرى', 11),
    ]

    for value, label_en, label_ar, sort_order in riwayah_options:
        MetadataOption.objects.create(
            metadata_type=riwayah_type,
            value=value,
            label_en=label_en,
            label_ar=label_ar,
            sort_order=sort_order,
            is_active=True,
        )

    print(f"  Created MetadataType: riwayah with {len(riwayah_options)} options")

    # =============================================================================
    # MUSHAF TYPE
    # =============================================================================
    mushaf_type = MetadataType.objects.create(
        name='mushaf_type',
        label_en='Mushaf Type',
        label_ar='نوع المصحف',
        description_en='Type of Mushaf (Quranic script/style)',
        description_ar='نوع المصحف (الخط القرآني/النمط)',
        is_multi_select=True,
        sort_order=2,
        is_active=True,
    )

    mushaf_options = [
        ('madani', 'Madani (Madinah)', 'مصحف المدينة', 1),
        ('uthmani', 'Uthmani', 'عثماني', 2),
        ('indo_pak', 'Indo-Pakistani', 'هندي/باكستاني', 3),
        ('moroccan', 'Moroccan', 'مغربي', 4),
        ('simple', 'Simple (Imlaei)', 'إملائي مبسط', 5),
        ('tajweed', 'Tajweed Colored', 'مصحف التجويد', 6),
        ('other', 'Other', 'أخرى', 7),
    ]

    for value, label_en, label_ar, sort_order in mushaf_options:
        MetadataOption.objects.create(
            metadata_type=mushaf_type,
            value=value,
            label_en=label_en,
            label_ar=label_ar,
            sort_order=sort_order,
            is_active=True,
        )

    print(f"  Created MetadataType: mushaf_type with {len(mushaf_options)} options")

    # =============================================================================
    # FEATURES
    # =============================================================================
    features_type = MetadataType.objects.create(
        name='features',
        label_en='Features',
        label_ar='الميزات',
        description_en='App features and capabilities',
        description_ar='ميزات وإمكانيات التطبيق',
        is_multi_select=True,
        sort_order=3,
        is_active=True,
    )

    feature_options = [
        ('offline', 'Offline Mode', 'وضع بدون اتصال', 1),
        ('audio', 'Audio Recitation', 'تلاوة صوتية', 2),
        ('translation', 'Translation', 'ترجمة', 3),
        ('tafsir', 'Tafsir', 'تفسير', 4),
        ('bookmarks', 'Bookmarks', 'إشارات مرجعية', 5),
        ('search', 'Search', 'بحث', 6),
        ('tajweed', 'Tajweed', 'تجويد', 7),
        ('dark_mode', 'Dark Mode', 'الوضع المظلم', 8),
        ('memorization', 'Memorization Tools', 'أدوات الحفظ', 9),
        ('prayer_times', 'Prayer Times', 'مواقيت الصلاة', 10),
        ('qibla', 'Qibla Direction', 'اتجاه القبلة', 11),
        ('notifications', 'Notifications', 'إشعارات', 12),
    ]

    for value, label_en, label_ar, sort_order in feature_options:
        MetadataOption.objects.create(
            metadata_type=features_type,
            value=value,
            label_en=label_en,
            label_ar=label_ar,
            sort_order=sort_order,
            is_active=True,
        )

    print(f"  Created MetadataType: features with {len(feature_options)} options")


def reverse_seed_metadata(apps, schema_editor):
    """Remove seeded metadata."""
    MetadataType = apps.get_model('metadata', 'MetadataType')

    # Deleting MetadataTypes will cascade delete MetadataOptions due to FK
    deleted_count = MetadataType.objects.filter(
        name__in=['riwayah', 'mushaf_type', 'features']
    ).delete()[0]

    print(f"  Deleted {deleted_count} MetadataType(s) and their options")


class Migration(migrations.Migration):

    dependencies = [
        ('metadata', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_metadata, reverse_seed_metadata),
    ]
