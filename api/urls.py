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
    path('empleados/', views.empleados_list, name='empleados_list'),
    path('empleados/<int:empleado_id>/', views.empleado_detail, name='empleado_detail'),
    # Productos
    path('categorias-producto/', views.categorias_producto_list, name='categorias_producto_list'),
    path('categorias-producto/<int:cat_id>/', views.categoria_producto_detail, name='categoria_producto_detail'),
    path('productos/', views.productos_list, name='productos_list'),
    path('productos/<int:producto_id>/', views.producto_detail, name='producto_detail'),
    # Platos
    path('categorias-plato/', views.categorias_plato_list, name='categorias_plato_list'),
    path('categorias-plato/<int:cat_id>/', views.categoria_plato_detail, name='categoria_plato_detail'),
    path('platos/', views.platos_list, name='platos_list'),
    path('platos/<int:plato_id>/', views.plato_detail, name='plato_detail'),
    # Ordenar
    path('ordenar/', views.ordenar_view, name='ordenar'),
]
