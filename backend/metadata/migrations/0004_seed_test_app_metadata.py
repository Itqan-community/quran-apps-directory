# Generated manually for testing AppMetadataValue feature
# Migration 0004: Add test AppMetadataValue records for admin demonstration

from django.db import migrations


def seed_test_app_metadata(apps, schema_editor):
    """
    Add 3 test AppMetadataValue records to demonstrate the feature.

    Links existing apps to metadata options so admin staff can see
    how the dynamic metadata system works.
    """
    App = apps.get_model('apps', 'App')
    MetadataOption = apps.get_model('metadata', 'MetadataOption')
    AppMetadataValue = apps.get_model('metadata', 'AppMetadataValue')

    # Get some existing apps (by slug for reliability)
    test_apps = list(App.objects.filter(status='published')[:3])

    if len(test_apps) < 3:
        print("  Skipping: Not enough published apps to create test records")
        return

    # Get some metadata options
    hafs = MetadataOption.objects.filter(value='hafs').first()
    warsh = MetadataOption.objects.filter(value='warsh').first()
    offline = MetadataOption.objects.filter(value='offline').first()

    if not all([hafs, warsh, offline]):
        print("  Skipping: Required metadata options not found")
        return

    created_count = 0

    # App 1: Assign Hafs riwayah
    app1 = test_apps[0]
    _, created = AppMetadataValue.objects.get_or_create(
        app=app1,
        metadata_option=hafs
    )
    if created:
        created_count += 1
        print(f"  Created: {app1.name_en} -> riwayah:hafs")

    # App 2: Assign Warsh riwayah
    app2 = test_apps[1]
    _, created = AppMetadataValue.objects.get_or_create(
        app=app2,
        metadata_option=warsh
    )
    if created:
        created_count += 1
        print(f"  Created: {app2.name_en} -> riwayah:warsh")

    # App 3: Assign offline feature
    app3 = test_apps[2]
    _, created = AppMetadataValue.objects.get_or_create(
        app=app3,
        metadata_option=offline
    )
    if created:
        created_count += 1
        print(f"  Created: {app3.name_en} -> features:offline")

    print(f"  Total AppMetadataValue records created: {created_count}")


def reverse_seed(apps, schema_editor):
    """Remove test AppMetadataValue records."""
    AppMetadataValue = apps.get_model('metadata', 'AppMetadataValue')
    MetadataOption = apps.get_model('metadata', 'MetadataOption')

    # Delete only the specific test records we created
    options = MetadataOption.objects.filter(value__in=['hafs', 'warsh', 'offline'])
    deleted = AppMetadataValue.objects.filter(metadata_option__in=options).delete()[0]
    print(f"  Deleted {deleted} test AppMetadataValue record(s)")


class Migration(migrations.Migration):

    dependencies = [
        ('metadata', '0003_migrate_app_data'),
        ('apps', '0020_add_multi_filter_fields'),
    ]

    operations = [
        migrations.RunPython(seed_test_app_metadata, reverse_seed),
    ]
