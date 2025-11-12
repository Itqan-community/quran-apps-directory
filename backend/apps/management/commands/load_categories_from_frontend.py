"""
Load categories from frontend categories definition.
"""

from django.core.management.base import BaseCommand
from categories.models import Category


class Command(BaseCommand):
    help = 'Load categories from frontend categories definition'

    def handle(self, *args, **options):
        # Categories from frontend src/app/services/applicationsData.ts
        categories_data = [
            {
                'name_en': 'Mushaf',
                'name_ar': 'المصحف',
                'slug': 'mushaf',
                'description_en': 'Complete Quran with various scripts and features',
                'description_ar': 'المصحف الكامل بخطوط ومزايا متعددة',
                'sort_order': 1,
            },
            {
                'name_en': 'Translations',
                'name_ar': 'الترجمات',
                'slug': 'translations',
                'description_en': 'Quran translations in multiple languages',
                'description_ar': 'ترجمات القرآن بلغات متعددة',
                'sort_order': 2,
            },
            {
                'name_en': 'Recite',
                'name_ar': 'التلاوة',
                'slug': 'recite',
                'description_en': 'Quran recitation and audio',
                'description_ar': 'تلاوة القرآن والتسجيلات الصوتية',
                'sort_order': 3,
            },
            {
                'name_en': 'Kids',
                'name_ar': 'الأطفال',
                'slug': 'kids',
                'description_en': 'Quran apps designed for children',
                'description_ar': 'تطبيقات القرآن المصممة للأطفال',
                'sort_order': 4,
            },
            {
                'name_en': 'Tafsir',
                'name_ar': 'التفسير',
                'slug': 'tafsir',
                'description_en': 'Quran interpretation and explanation',
                'description_ar': 'تفسير وشرح القرآن',
                'sort_order': 5,
            },
            {
                'name_en': 'Riwayat',
                'name_ar': 'الروايات',
                'slug': 'riwayat',
                'description_en': 'Different Quran recitation styles',
                'description_ar': 'روايات القراءة المختلفة',
                'sort_order': 6,
            },
            {
                'name_en': 'Audio',
                'name_ar': 'الصوتيات',
                'slug': 'audio',
                'description_en': 'Audio recitations and features',
                'description_ar': 'التلاوات والمزايا الصوتية',
                'sort_order': 7,
            },
            {
                'name_en': 'Memorize',
                'name_ar': 'الحفظ',
                'slug': 'memorize',
                'description_en': 'Quran memorization tools',
                'description_ar': 'أدوات حفظ القرآن',
                'sort_order': 8,
            },
            {
                'name_en': 'Tajweed',
                'name_ar': 'التجويد',
                'slug': 'tajweed',
                'description_en': 'Tajweed rules and pronunciation',
                'description_ar': 'أحكام التجويد والنطق',
                'sort_order': 9,
            },
            {
                'name_en': 'Accessibility',
                'name_ar': 'إمكانية الوصول',
                'slug': 'accessibility',
                'description_en': 'Accessible Quran apps for people with disabilities',
                'description_ar': 'تطبيقات القرآن للأشخاص ذوي الإعاقة',
                'sort_order': 10,
            },
            {
                'name_en': 'Tools',
                'name_ar': 'الأدوات',
                'slug': 'tools',
                'description_en': 'Quran study and research tools',
                'description_ar': 'أدوات دراسة وبحث القرآن',
                'sort_order': 11,
            },
        ]

        created_count = 0
        updated_count = 0

        self.stdout.write('Loading categories from frontend definition...')

        for cat_data in categories_data:
            category, created = Category.objects.update_or_create(
                slug=cat_data['slug'],
                defaults={
                    'name_en': cat_data['name_en'],
                    'name_ar': cat_data['name_ar'],
                    'description_en': cat_data['description_en'],
                    'description_ar': cat_data['description_ar'],
                    'sort_order': cat_data['sort_order'],
                    'is_active': True,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✅ Created: {category.name_en} ({category.name_ar})'))
            else:
                updated_count += 1
                self.stdout.write(f'  ✏️  Updated: {category.name_en} ({category.name_ar})')

        self.stdout.write(self.style.SUCCESS(
            f'\n🎉 Completed! Created: {created_count}, Updated: {updated_count}'
        ))
