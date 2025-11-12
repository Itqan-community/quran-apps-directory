# Generated manually on 2025-11-12 for production cache table
# PostgreSQL-compatible migration

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS django_cache_table (
                cache_key VARCHAR(300) PRIMARY KEY,
                value BYTEA NOT NULL,
                expires BIGINT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS django_cache_table_expires ON django_cache_table (expires);
            """,
            """
            DROP TABLE IF EXISTS django_cache_table CASCADE;
            """,
            state_operations=[]
        ),
    ]
