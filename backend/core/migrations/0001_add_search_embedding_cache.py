import pgvector.django
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='SearchEmbeddingCache',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('query_hash', models.CharField(db_index=True, max_length=64, unique=True)),
                ('query_text', models.TextField()),
                ('embedding', pgvector.django.VectorField(dimensions=768)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'core_search_embedding_cache',
            },
        ),
    ]
