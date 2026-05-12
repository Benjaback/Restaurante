from django.http import JsonResponse

# Create your views here.

def home_api(request):
    return JsonResponse({
        'message': 'Hola desde Django API (MySQL configurada) - Home',
        'status': 'ok',
    })
