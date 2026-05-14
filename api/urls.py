from django.urls import path
from . import views

urlpatterns = [
    path('home/', views.home_api, name='home_api'),
    path('roles/', views.roles_list, name='roles_list'),
    path('roles/<int:rol_id>/', views.rol_detail, name='rol_detail'),
    path('empleados/', views.empleados_list, name='empleados_list'),
    path('empleados/<int:empleado_id>/', views.empleado_detail, name='empleado_detail'),
]
