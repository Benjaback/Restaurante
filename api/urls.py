from django.urls import path
from . import views

urlpatterns = [
    path('home/', views.home_api, name='home_api'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me_view, name='me'),
    path('roles/', views.roles_list, name='roles_list'),
    path('roles/<int:rol_id>/', views.rol_detail, name='rol_detail'),
    path('turnos/', views.turnos_list, name='turnos_list'),
    path('turnos/<int:turno_id>/', views.turno_detail, name='turno_detail'),
    path('empleados/', views.empleados_list, name='empleados_list'),
    path('empleados/<int:empleado_id>/', views.empleado_detail, name='empleado_detail'),
    # Productos
    path('categorias-producto/', views.categorias_producto_list, name='categorias_producto_list'),
    path('categorias-producto/<int:cat_id>/', views.categoria_producto_detail, name='categoria_producto_detail'),
    path('productos/', views.productos_list, name='productos_list'),
    path('productos/<int:producto_id>/', views.producto_detail, name='producto_detail'),
    path('productos/<int:producto_id>/usos/', views.producto_usos, name='producto_usos'),
    # Platos
    path('categorias-plato/', views.categorias_plato_list, name='categorias_plato_list'),
    path('categorias-plato/<int:cat_id>/', views.categoria_plato_detail, name='categoria_plato_detail'),
    path('platos/', views.platos_list, name='platos_list'),
    path('platos/<int:plato_id>/', views.plato_detail, name='plato_detail'),
    # Ordenar
    path('ordenar/', views.ordenar_view, name='ordenar'),
    # Receta de productos (elaboración)
    path('recetas-producto/', views.recetas_producto_list, name='recetas_producto_list'),
    path('recetas-producto/<int:receta_id>/', views.receta_producto_detail, name='receta_producto_detail'),
    # Producción
    path('producciones/', views.producciones_list, name='producciones_list'),
    # Mesas
    path('mesas/', views.mesas_list, name='mesas_list'),
    path('mesas/<int:mesa_id>/', views.mesa_detail, name='mesa_detail'),
    # Asignaciones de mesa
    path('asignaciones/', views.asignaciones_list, name='asignaciones_list'),
    path('asignaciones/<int:asignacion_id>/', views.asignacion_detail, name='asignacion_detail'),
    # Pedidos
    path('pedidos/', views.pedidos_list, name='pedidos_list'),
    path('pedidos/<int:pedido_id>/', views.pedido_detail, name='pedido_detail'),
    path('pedidos/<int:pedido_id>/confirmar/', views.confirmar_pedido_view, name='confirmar_pedido'),
    # Pagos
    path('pagos/', views.pagos_list, name='pagos_list'),
    # Tickets
    path('tickets/', views.tickets_list, name='tickets_list'),
    # Caja
    path('cajas/', views.cajas_list, name='cajas_list'),
    path('cajas/<int:caja_id>/', views.caja_detail, name='caja_detail'),
    path('movimientos-caja/', views.movimientos_caja_list, name='movimientos_caja_list'),
    # Reservas
    path('reservas/', views.reservas_list, name='reservas_list'),
    path('reservas/<int:reserva_id>/', views.reserva_detail, name='reserva_detail'),
    # Upload
    path('upload-imagen/', views.upload_imagen_view, name='upload_imagen'),
]
