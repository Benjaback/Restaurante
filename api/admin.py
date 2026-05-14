from django.contrib import admin
from .models import Empleado, Rol

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

