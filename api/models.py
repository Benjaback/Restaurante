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


class Turno(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Turno'
        verbose_name_plural = 'Turnos'
        ordering = ['hora_inicio']

    def __str__(self):
        return self.nombre


class Empleado(models.Model):
    user = models.OneToOneField(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='empleado',
    )
    nombre = models.CharField(max_length=120)
    apellido = models.CharField(max_length=120, blank=True, default='')
    dni = models.CharField(max_length=15, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    direccion = models.TextField(blank=True)
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE)
    turno = models.ForeignKey(
        Turno,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='empleados',
    )
    telefono = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_contratacion = models.DateField(blank=True, null=True)

    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        ordering = ['rol', 'apellido', 'nombre']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.user and self.rol and self.rol.group:
            self.user.groups.set([self.rol.group])
            if self.user.is_active != self.activo:
                self.user.is_active = self.activo
                self.user.save(update_fields=['is_active'])

    def __str__(self):
        return f'{self.nombre} {self.apellido} ({self.rol.nombre})'


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
    precio_compra = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Precio de compra')
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
    imagen = models.URLField(blank=True, verbose_name='URL de imagen')
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


class RecetaProducto(models.Model):
    producto_elaborado = models.ForeignKey(
        Producto, on_delete=models.CASCADE, related_name='recetas_elaboracion'
    )
    producto_insumo = models.ForeignKey(
        Producto, on_delete=models.CASCADE, related_name='usado_en_recetas'
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Receta de producto'
        verbose_name_plural = 'Recetas de producto'
        unique_together = [('producto_elaborado', 'producto_insumo')]

    def __str__(self):
        return f'{self.producto_elaborado.nombre} ← {self.cantidad} {self.producto_insumo.unidad} de {self.producto_insumo.nombre}'


class Produccion(models.Model):
    producto = models.ForeignKey(
        Producto, on_delete=models.CASCADE, related_name='producciones'
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Producción'
        verbose_name_plural = 'Producciones'
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.producto.nombre} x{self.cantidad} — {self.fecha.strftime("%d/%m/%Y %H:%M")}'


class Mesa(models.Model):
    numero = models.IntegerField()
    capacidad = models.IntegerField(default=4)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Mesa'
        verbose_name_plural = 'Mesas'
        ordering = ['numero']

    def __str__(self):
        return f'Mesa {self.numero} ({self.capacidad} pers.)'


class AsignacionMesa(models.Model):
    mesa = models.ForeignKey(Mesa, on_delete=models.CASCADE, related_name='asignaciones')
    empleado = models.ForeignKey(
        Empleado, on_delete=models.CASCADE, related_name='asignaciones_mesa',
        limit_choices_to={'rol__nombre': 'Mesero', 'activo': True},
    )
    turno = models.ForeignKey(Turno, on_delete=models.CASCADE, related_name='asignaciones_mesa')
    fecha = models.DateField()

    class Meta:
        verbose_name = 'Asignación de mesa'
        verbose_name_plural = 'Asignaciones de mesas'
        unique_together = [('mesa', 'turno', 'fecha')]
        ordering = ['fecha', 'turno__hora_inicio', 'mesa__numero']

    def __str__(self):
        return f'Mesa {self.mesa.numero} → {self.empleado.nombre} ({self.turno.nombre} {self.fecha})'


class Pedido(models.Model):
    ESTADOS = [
        ('abierto', 'Abierto'),
        ('en_preparacion', 'En preparación'),
        ('servido', 'Servido'),
        ('cerrado', 'Cerrado'),
        ('pagado', 'Pagado'),
    ]
    mesa = models.ForeignKey(Mesa, on_delete=models.CASCADE, related_name='pedidos')
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='pedidos')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='abierto')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f'Pedido #{self.id} - Mesa {self.mesa.numero} ({self.estado})'


class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='detalles')
    plato = models.ForeignKey(Plato, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Detalle de pedido'
        verbose_name_plural = 'Detalles de pedido'

    def __str__(self):
        return f'{self.cantidad}x {self.plato.nombre} (${self.subtotal})'


class Pago(models.Model):
    METODOS = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
    ]
    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, related_name='pago')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo = models.CharField(max_length=20, choices=METODOS)
    vuelto = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'

    def __str__(self):
        return f'Pago Pedido #{self.pedido.id} - ${self.monto} ({self.get_metodo_display()})'


class Ticket(models.Model):
    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, related_name='ticket')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_emision = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'

    def __str__(self):
        return f'Ticket #{self.id} - Pedido #{self.pedido.id} (${self.total})'


class Caja(models.Model):
    empleado_apertura = models.ForeignKey(
        Empleado, on_delete=models.CASCADE, related_name='cajas_apertura'
    )
    empleado_cierre = models.ForeignKey(
        Empleado, null=True, blank=True, on_delete=models.CASCADE,
        related_name='cajas_cierre'
    )
    fecha_apertura = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    monto_final = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Caja'
        verbose_name_plural = 'Cajas'
        ordering = ['-fecha_apertura']

    def __str__(self):
        estado = 'Abierta' if self.activa else 'Cerrada'
        return f'Caja {self.fecha_apertura.strftime("%d/%m/%Y")} ({estado})'


class MovimientoCaja(models.Model):
    TIPOS = [
        ('ingreso', 'Ingreso'),
        ('egreso', 'Egreso'),
    ]
    caja = models.ForeignKey(Caja, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=TIPOS)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    referencia = models.CharField(max_length=100, blank=True)
    descripcion = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimiento de caja'
        verbose_name_plural = 'Movimientos de caja'
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.get_tipo_display()} ${self.monto} - {self.referencia or self.descripcion or "Sin referencia"}'


class Reserva(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
        ('cumplida', 'Cumplida'),
    ]
    nombre_cliente = models.CharField(max_length=120)
    telefono = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    fecha = models.DateField()
    hora = models.TimeField()
    personas = models.IntegerField(default=1)
    mesa = models.ForeignKey(Mesa, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservas')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    empleado = models.ForeignKey(Empleado, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservas')
    notas = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Reserva'
        verbose_name_plural = 'Reservas'
        ordering = ['fecha', 'hora']

    def __str__(self):
        return f'{self.nombre_cliente} - {self.fecha} {self.hora.strftime("%H:%M")} ({self.personas} pers.)'
