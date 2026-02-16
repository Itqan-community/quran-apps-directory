# Generated manually for Multi-Filter API Support
# Migration 0003: Migrate existing App JSONField data to AppMetadataValue records

from django.db import migrations


def migrate_app_metadata(apps, schema_editor):
    """
    Migrate existing App JSONField data (riwayah, mushaf_type, features)
    to the new AppMetadataValue M2M junction table.

    This reads the JSONField arrays from each App and creates corresponding
    AppMetadataValue records linking the App to the appropriate MetadataOption.
    """
    App = apps.get_model('apps', 'App')
    MetadataType = apps.get_model('metadata', 'MetadataType')
    MetadataOption = apps.get_model('metadata', 'MetadataOption')
    AppMetadataValue = apps.get_model('metadata', 'AppMetadataValue')

    # Build a lookup dict for quick access to MetadataOptions
    # Structure: {metadata_type_name: {option_value: MetadataOption}}
    option_lookup = {}
    for metadata_type in MetadataType.objects.all():
        option_lookup[metadata_type.name] = {
            opt.value: opt for opt in metadata_type.options.all()
        }

    # Define which App fields map to which MetadataType
    field_mapping = [
        ('riwayah', 'riwayah'),
        ('mushaf_type', 'mushaf_type'),
        ('features', 'features'),
    ]

    total_created = 0
    apps_processed = 0

    for app in App.objects.all():
        app_values_created = 0

        for app_field, metadata_type_name in field_mapping:
            # Get the JSONField value (list of strings)
            values = getattr(app, app_field, None) or []

            if not values:
                continue

            # Ensure it's a list (handle edge cases)
            if isinstance(values, str):
                values = [values]

            for value in values:
                # Normalize the value (lowercase, strip whitespace)
                normalized_value = str(value).lower().strip()

                if not normalized_value:
                    continue

                # Look up the MetadataOption
                metadata_options = option_lookup.get(metadata_type_name, {})
                metadata_option = metadata_options.get(normalized_value)

                if not metadata_option:
                    # Option doesn't exist in seed data - skip with warning
                    print(f"  WARNING: Unknown {metadata_type_name} value '{normalized_value}' for app '{app.name_en}'")
                    continue

                # Check if this AppMetadataValue already exists
                if not AppMetadataValue.objects.filter(app=app, metadata_option=metadata_option).exists():
                    AppMetadataValue.objects.create(app=app, metadata_option=metadata_option)
                    app_values_created += 1

        if app_values_created > 0:
            apps_processed += 1
            total_created += app_values_created

    print(f"  Migrated {total_created} metadata values for {apps_processed} apps")


def reverse_migrate_app_metadata(apps, schema_editor):
    """
    Remove all AppMetadataValue records (reverse migration).

    Note: This does NOT restore the JSONField data since that data
    still exists in the App model during this migration phase.
    """
    AppMetadataValue = apps.get_model('metadata', 'AppMetadataValue')

    deleted_count = AppMetadataValue.objects.all().delete()[0]
    print(f"  Deleted {deleted_count} AppMetadataValue record(s)")


class Migration(migrations.Migration):

    dependencies = [
        ('metadata', '0002_seed_metadata'),
        ('apps', '0020_add_multi_filter_fields'),  # Ensure App JSONFields exist
    ]

    operations = [
        migrations.RunPython(migrate_app_metadata, reverse_migrate_app_metadata),
    ]
