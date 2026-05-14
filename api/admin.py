from django.contrib import admin
from .models import CategoriaPlato, CategoriaProducto, Empleado, Plato, Producto, Receta, Rol

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
        'user',
        'rol',
        'turno',
        'activo',
        'telefono',
        'email',
        'fecha_creacion',
    )
    list_filter = ('rol', 'turno', 'activo')
    search_fields = ('nombre', 'telefono', 'email', 'user__username')
    ordering = ('rol', 'turno', 'nombre')
    raw_id_fields = ('user',)

@admin.register(CategoriaProducto)
class CategoriaProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'stock', 'unidad', 'stock_minimo', 'activo')
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

