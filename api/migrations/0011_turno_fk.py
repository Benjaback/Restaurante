from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_turno_alter_empleado_turno'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "UPDATE api_empleado SET turno = CASE turno WHEN 'manana' THEN '1' WHEN 'tarde' THEN '2' WHEN 'noche' THEN '3' ELSE NULL END",
                'ALTER TABLE api_empleado MODIFY COLUMN turno bigint NULL',
            ],
            reverse_sql=[
                "ALTER TABLE api_empleado MODIFY COLUMN turno varchar(20) NOT NULL DEFAULT ''",
                "UPDATE api_empleado SET turno = CASE turno WHEN 1 THEN 'manana' WHEN 2 THEN 'tarde' WHEN 3 THEN 'noche' ELSE NULL END",
            ],
        ),
        migrations.AlterField(
            model_name='empleado',
            name='turno',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='empleados', to='api.turno'),
        ),
        migrations.AlterModelOptions(
            name='empleado',
            options={'ordering': ['rol', 'apellido', 'nombre'], 'verbose_name': 'Empleado', 'verbose_name_plural': 'Empleados'},
        ),
    ]