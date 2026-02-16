from django.db import migrations


def clear_broken_logos(apps, schema_editor):
    Developer = apps.get_model('developers', 'Developer')
    updated = Developer.objects.filter(
        name_en__in=[
            'Abdullah Bajaber',
            'Badr Alhanaky',
            'Islam phone',
            'Noor International',
            'Arabia IT',
            'Ealamy group',
        ]
    ).update(logo_url='')
    print(f"  Cleared {updated} broken developer logos")


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0023_fix_zuolfa_screenshots_and_sort'),
    ]

    operations = [
        migrations.RunPython(clear_broken_logos, migrations.RunPython.noop),
    ]
