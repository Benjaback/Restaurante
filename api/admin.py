from django.contrib import admin
from .models import Caja, CategoriaPlato, CategoriaProducto, DetallePedido, Empleado, MovimientoCaja, Pago, Pedido, Plato, Produccion, Producto, Receta, RecetaProducto, Reserva, Rol, Ticket

@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion', 'activo', 'group', 'fecha_creacion')
    list_filter = ('activo',)
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)

@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'dni',
        'user',
        'rol',
        'turno',
        'activo',
        'telefono',
        'email',
        'fecha_contratacion',
    )
    list_filter = ('rol', 'turno', 'activo')
    search_fields = ('nombre', 'dni', 'telefono', 'email', 'user__username')
    ordering = ('rol', 'turno', 'nombre')
    raw_id_fields = ('user',)

@admin.register(CategoriaProducto)
class CategoriaProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'stock', 'precio_compra', 'unidad', 'stock_minimo', 'activo')
    list_filter = ('categoria', 'activo')
    search_fields = ('nombre',)

@admin.register(CategoriaPlato)
class CategoriaPlatoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)

@admin.register(Plato)
class PlatoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'categoria', 'activo')
    list_filter = ('categoria', 'activo')
    search_fields = ('nombre', 'descripcion')

@admin.register(Receta)
class RecetaAdmin(admin.ModelAdmin):
    list_display = ('plato', 'producto', 'cantidad')
    list_filter = ('plato',)

@admin.register(RecetaProducto)
class RecetaProductoAdmin(admin.ModelAdmin):
    list_display = ('producto_elaborado', 'producto_insumo', 'cantidad')
    list_filter = ('producto_elaborado',)

@admin.register(Produccion)
class ProduccionAdmin(admin.ModelAdmin):
    list_display = ('producto', 'cantidad', 'fecha', 'descripcion')
    list_filter = ('producto', 'fecha')

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'mesa', 'empleado', 'estado', 'total', 'fecha_creacion')
    list_filter = ('estado', 'fecha_creacion')
    search_fields = ('mesa__numero', 'empleado__nombre')

@admin.register(DetallePedido)
class DetallePedidoAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'plato', 'cantidad', 'precio_unitario', 'subtotal')

@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'monto', 'metodo', 'vuelto', 'fecha')
    list_filter = ('metodo',)

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'total', 'fecha_emision')

@admin.register(Caja)
class CajaAdmin(admin.ModelAdmin):
    list_display = ('id', 'empleado_apertura', 'activa', 'fecha_apertura', 'monto_inicial')
    list_filter = ('activa',)

@admin.register(MovimientoCaja)
class MovimientoCajaAdmin(admin.ModelAdmin):
    list_display = ('caja', 'tipo', 'monto', 'referencia', 'fecha')
    list_filter = ('tipo',)

@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ('nombre_cliente', 'fecha', 'hora', 'personas', 'mesa', 'estado')
    list_filter = ('estado', 'fecha')
    search_fields = ('nombre_cliente', 'telefono')

