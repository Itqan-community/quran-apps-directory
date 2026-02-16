# Generated migration to fix Arabic category names

from django.db import migrations


def fix_arabic_category_names(apps, schema_editor):
    """Update all category name_ar fields with proper Arabic translations"""
    Category = apps.get_model('categories', 'Category')

    # Mapping of English category names to Arabic translations
    arabic_translations = {
        'Mushaf': 'مصحف',
        'Translations': 'ترجمات',
        'Recite': 'تلاوة',
        'Kids': 'أطفال',
        'Tafsir': 'تفسير',
        'Riwayat': 'روايات',
        'Audio': 'صوتيات',
        'Memorize': 'حفظ',
        'Tajweed': 'تجويد',
        'Accessibility': 'إتاحة',
        'Other': 'أخرى',
        'Tools': 'أدوات',
    }

    for name_en, name_ar in arabic_translations.items():
        category = Category.objects.filter(name_en=name_en).first()
        if category:
            category.name_ar = name_ar
            category.save(update_fields=['name_ar'])
            print(f"Updated {name_en} -> {name_ar}")
        else:
            print(f"Warning: Category '{name_en}' not found")


def revert_arabic_category_names(apps, schema_editor):
    """Revert Arabic category names to lowercase English (for rollback)"""
    Category = apps.get_model('categories', 'Category')

    for category in Category.objects.all():
        category.name_ar = category.name_en.lower()
        category.save(update_fields=['name_ar'])
        print(f"Reverted {category.name_en} -> {category.name_ar}")


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0005_rename_tools_to_other_and_reorder'),
    ]

    operations = [
        migrations.RunPython(fix_arabic_category_names, revert_arabic_category_names),
    ]
