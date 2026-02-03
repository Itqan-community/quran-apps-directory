# Generated manually for Multi-Filter API Support
# Migration 0001: Create MetadataType, MetadataOption, AppMetadataValue tables

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('apps', '0020_add_multi_filter_fields'),
    ]

    operations = [
        # Create MetadataType table
        migrations.CreateModel(
            name='MetadataType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.SlugField(
                    help_text="API key for this metadata (e.g., 'riwayah'). Used in query params like ?riwayah=hafs",
                    max_length=50,
                    unique=True,
                    validators=[django.core.validators.RegexValidator(
                        regex=r'^[a-z][a-z0-9_]*$',
                        message='Slug must start with a letter and contain only lowercase letters, numbers, and underscores.'
                    )]
                )),
                ('label_en', models.CharField(help_text="English display name (e.g., 'Riwayah')", max_length=100)),
                ('label_ar', models.CharField(help_text="Arabic display name (e.g., 'الرواية')", max_length=100)),
                ('description_en', models.TextField(blank=True, help_text='English description for tooltips/help text')),
                ('description_ar', models.TextField(blank=True, help_text='Arabic description for tooltips/help text')),
                ('is_multi_select', models.BooleanField(default=True, help_text='Can an app have multiple values for this metadata? (e.g., multiple riwayat)')),
                ('sort_order', models.PositiveIntegerField(default=0, help_text='Display order in filter UI (lower = first)')),
                ('is_active', models.BooleanField(db_index=True, default=True, help_text='Inactive metadata types are hidden from API and admin')),
                ('icon', models.TextField(blank=True, help_text='SVG icon or icon class for this metadata type')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Metadata Type',
                'verbose_name_plural': 'Metadata Types',
                'db_table': 'metadata_types',
                'ordering': ['sort_order', 'name'],
            },
        ),
        # Create MetadataOption table
        migrations.CreateModel(
            name='MetadataOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.SlugField(
                    help_text="API value (e.g., 'hafs'). Used in query params like ?riwayah=hafs",
                    max_length=50,
                    validators=[django.core.validators.RegexValidator(
                        regex=r'^[a-z][a-z0-9_]*$',
                        message='Slug must start with a letter and contain only lowercase letters, numbers, and underscores.'
                    )]
                )),
                ('label_en', models.CharField(help_text="English display label (e.g., 'Hafs')", max_length=100)),
                ('label_ar', models.CharField(help_text="Arabic display label (e.g., 'حفص')", max_length=100)),
                ('description_en', models.TextField(blank=True, help_text='English description for tooltips')),
                ('description_ar', models.TextField(blank=True, help_text='Arabic description for tooltips')),
                ('sort_order', models.PositiveIntegerField(default=0, help_text='Display order within this metadata type (lower = first)')),
                ('is_active', models.BooleanField(db_index=True, default=True, help_text='Inactive options are hidden from API and admin')),
                ('icon', models.TextField(blank=True, help_text='SVG icon or icon class for this option')),
                ('color', models.CharField(blank=True, help_text="Hex color code (e.g., '#A0533B') for UI styling", max_length=7)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('metadata_type', models.ForeignKey(
                    help_text='The metadata type this option belongs to',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='options',
                    to='metadata.metadatatype'
                )),
            ],
            options={
                'verbose_name': 'Metadata Option',
                'verbose_name_plural': 'Metadata Options',
                'db_table': 'metadata_options',
                'ordering': ['metadata_type', 'sort_order', 'value'],
            },
        ),
        # Create AppMetadataValue table (M2M junction)
        migrations.CreateModel(
            name='AppMetadataValue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('app', models.ForeignKey(
                    help_text='The app this metadata value is assigned to',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='metadata_values',
                    to='apps.app'
                )),
                ('metadata_option', models.ForeignKey(
                    help_text='The metadata option assigned to this app',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='app_values',
                    to='metadata.metadataoption'
                )),
            ],
            options={
                'verbose_name': 'App Metadata Value',
                'verbose_name_plural': 'App Metadata Values',
                'db_table': 'app_metadata_values',
                'ordering': ['app', 'metadata_option__metadata_type', 'metadata_option__sort_order'],
            },
        ),
        # Add indexes for MetadataOption
        migrations.AddIndex(
            model_name='metadataoption',
            index=models.Index(fields=['metadata_type', 'is_active'], name='metadata_op_metadat_idx'),
        ),
        migrations.AddIndex(
            model_name='metadataoption',
            index=models.Index(fields=['value'], name='metadata_op_value_idx'),
        ),
        # Add unique constraint for MetadataOption (metadata_type + value)
        migrations.AddConstraint(
            model_name='metadataoption',
            constraint=models.UniqueConstraint(fields=['metadata_type', 'value'], name='unique_metadata_type_value'),
        ),
        # Add indexes for AppMetadataValue
        migrations.AddIndex(
            model_name='appmetadatavalue',
            index=models.Index(fields=['app', 'metadata_option'], name='app_meta_app_opt_idx'),
        ),
        migrations.AddIndex(
            model_name='appmetadatavalue',
            index=models.Index(fields=['metadata_option', 'app'], name='app_meta_opt_app_idx'),
        ),
        # Add unique constraint for AppMetadataValue (app + metadata_option)
        migrations.AddConstraint(
            model_name='appmetadatavalue',
            constraint=models.UniqueConstraint(fields=['app', 'metadata_option'], name='unique_app_metadata_option'),
        ),
    ]
