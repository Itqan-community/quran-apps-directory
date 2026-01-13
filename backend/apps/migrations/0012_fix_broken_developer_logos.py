"""
Fix broken developer logo URLs that had '.Not Found' as file extension.

This migration updates 5 developers with correct logo URLs after uploading
the actual logo files to R2 storage.
"""
from django.db import migrations


def fix_developer_logos(apps, schema_editor):
    Developer = apps.get_model('developers', 'Developer')
    R2_BASE = 'https://pub-e11717db663c469fb51c65995892b449.r2.dev'

    updates = [
        ('Quran.com', f'{R2_BASE}/15_Ayah/developer_logo.svg'),
        ('Faisal Haddad', f'{R2_BASE}/53_Moeen/developer_logo.png'),
        ('Liajlehum', f'{R2_BASE}/56_Tebyan Quran/developer_logo.png'),
        ('Wiqaya', f'{R2_BASE}/63_Wiqaya/developer_logo.png'),
        ('Quranic Recitations Collection', f'{R2_BASE}/70_Quranic Recitations Collection/developer_logo.svg'),
    ]

    for name, new_logo_url in updates:
        updated = Developer.objects.filter(name_en=name).update(logo_url=new_logo_url)
        if updated:
            print(f"  Updated logo for: {name}")
        else:
            print(f"  Developer not found: {name}")


def reverse_migration(apps, schema_editor):
    # No-op reverse - we don't want to restore broken URLs
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('apps', '0011_add_surah_app'),
    ]

    operations = [
        migrations.RunPython(fix_developer_logos, reverse_migration),
    ]
