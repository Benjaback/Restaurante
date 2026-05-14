import secrets
from django.contrib.auth.models import Group, User
from django.db import models


class AuthToken(models.Model):
    key = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_tokens')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Token de autenticación'
        verbose_name_plural = 'Tokens de autenticación'

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.key[:12]}... ({self.user.username})'

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


class CategoriaProducto(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Categoría de producto'
        verbose_name_plural = 'Categorías de producto'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    nombre = models.CharField(max_length=120)
    categoria = models.ForeignKey(CategoriaProducto, null=True, blank=True, on_delete=models.SET_NULL)
    stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unidad = models.CharField(max_length=30, default='unidad')
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']

    def __str__(self):
        return f'{self.nombre} ({self.stock} {self.unidad})'


class CategoriaPlato(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Categoría de plato'
        verbose_name_plural = 'Categorías de plato'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Plato(models.Model):
    nombre = models.CharField(max_length=120)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    categoria = models.ForeignKey(CategoriaPlato, null=True, blank=True, on_delete=models.SET_NULL)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Plato'
        verbose_name_plural = 'Platos'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Receta(models.Model):
    plato = models.ForeignKey(Plato, on_delete=models.CASCADE, related_name='recetas')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Receta'
        verbose_name_plural = 'Recetas'
        unique_together = [('plato', 'producto')]

    def __str__(self):
        return f'{self.plato.nombre} ← {self.cantidad} {self.producto.unidad} de {self.producto.nombre}'
