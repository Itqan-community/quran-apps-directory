# Generated manually on 2025-11-12 for production cache table

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS django_cache_table (
                cache_key VARCHAR(300) PRIMARY KEY,
                value LONGBLOB NOT NULL,
                expires BIGINT NOT NULL
            )
            """,
            """
            DROP TABLE IF EXISTS django_cache_table
            """
        ),
    ]
