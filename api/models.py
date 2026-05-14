from django.contrib.auth.models import Group, User
from django.db import models

class Rol(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    group = models.OneToOneField(
        Group,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='rol',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['nombre']

    def save(self, *args, **kwargs):
        if self.group is None:
            group, created = Group.objects.get_or_create(name=self.nombre)
            self.group = group
        elif self.group.name != self.nombre:
            self.group.name = self.nombre
            self.group.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre

class Empleado(models.Model):
    SHIFT_CHOICES = [
        ('manana', 'Mañana'),
        ('tarde', 'Tarde'),
        ('noche', 'Noche'),
    ]

    user = models.OneToOneField(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='empleado',
    )
    nombre = models.CharField(max_length=120)
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE)
    turno = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    telefono = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        ordering = ['rol', 'turno', 'nombre']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.user and self.rol and self.rol.group:
            self.user.groups.set([self.rol.group])
            if self.user.is_active != self.activo:
                self.user.is_active = self.activo
                self.user.save(update_fields=['is_active'])

    def __str__(self):
        return f'{self.nombre} ({self.rol.nombre})'
