import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('apps', '0025_populate_app_metadata'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssistantConversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.UUIDField(default=uuid.uuid4, unique=True)),
                ('answers', models.JSONField()),
                ('result_app_ids', models.JSONField(default=list)),
                ('selected_app', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='assistant_conversations',
                    to='apps.app'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('lang', models.CharField(default='ar', max_length=2)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
