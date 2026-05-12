from django.urls import path
from . import views

urlpatterns = [
    path('home/', views.home_api, name='home_api'),
]
