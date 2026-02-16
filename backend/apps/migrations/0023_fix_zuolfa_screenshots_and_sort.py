from django.db import migrations

R2_BASE = 'app-images/zuolfa'

SCREENSHOT_MAPPING = {
    'ar': {
        'https://zuolfa.com/wp-content/uploads/2025/12/1.png': f'{R2_BASE}/screenshot_ar_1.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/2.png': f'{R2_BASE}/screenshot_ar_2.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/3.png': f'{R2_BASE}/screenshot_ar_3.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/4.png': f'{R2_BASE}/screenshot_ar_4.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/5.png': f'{R2_BASE}/screenshot_ar_5.png',
    },
    'en': {
        'https://zuolfa.com/wp-content/uploads/2025/12/1-en.png': f'{R2_BASE}/screenshot_en_1.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/2-en.png': f'{R2_BASE}/screenshot_en_2.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/3-en.png': f'{R2_BASE}/screenshot_en_3.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/4-en.png': f'{R2_BASE}/screenshot_en_4.png',
        'https://zuolfa.com/wp-content/uploads/2025/12/5-en.png': f'{R2_BASE}/screenshot_en_5.png',
    },
}


def fix_zuolfa(apps, schema_editor):
    App = apps.get_model('apps', 'App')
    AppScreenshot = apps.get_model('apps', 'AppScreenshot')

    try:
        app = App.objects.get(id=45)
    except App.DoesNotExist:
        print("  App 45 (zuolfa) not found, skipping")
        return

    # Update sort_order
    app.sort_order = 15
    app.save(update_fields=['sort_order'])
    print(f"  Updated zuolfa sort_order to 15")

    # Update screenshot image paths
    screenshots = AppScreenshot.objects.filter(app=app)
    updated = 0
    for ss in screenshots:
        lang_map = SCREENSHOT_MAPPING.get(ss.language, {})
        old_name = ss.image.name if ss.image else ''
        if old_name in lang_map:
            ss.image = lang_map[old_name]
            ss.save(update_fields=['image'])
            updated += 1
    print(f"  Updated {updated} screenshot paths")


class Migration(migrations.Migration):
    dependencies = [
        ('apps', '0022_fix_zuolfa_images'),
    ]

    operations = [
        migrations.RunPython(fix_zuolfa, migrations.RunPython.noop),
    ]
