import json
from django.contrib.auth.models import Group, User
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseNotAllowed
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from .models import Empleado, Rol


def rol_to_dict(rol):
    return {
        'id': rol.id,
        'nombre': rol.nombre,
        'descripcion': rol.descripcion,
        'activo': rol.activo,
        'group': rol.group.name if rol.group else None,
        'fecha_creacion': rol.fecha_creacion.isoformat(),
    }


def empleado_to_dict(empleado):
    return {
        'id': empleado.id,
        'nombre': empleado.nombre,
        'rol': {
            'id': empleado.rol.id,
            'nombre': empleado.rol.nombre,
        },
        'turno': empleado.turno,
        'telefono': empleado.telefono,
        'email': empleado.email,
        'activo': empleado.activo,
        'fecha_creacion': empleado.fecha_creacion.isoformat(),
        'user': {
            'id': empleado.user.id,
            'username': empleado.user.username,
            'email': empleado.user.email,
            'is_active': empleado.user.is_active,
        } if empleado.user else None,
    }


def make_available_username(base_username):
    username = base_username.lower().strip().replace(' ', '_')
    username = ''.join(ch for ch in username if ch.isalnum() or ch == '_')
    if not username:
        username = f'empleado{get_random_string(5)}'
    original = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f'{original}{counter}'
        counter += 1
    return username


def create_user_for_empleado(payload, rol, activo=True):
    username = payload.get('username') or payload.get('email') or payload.get('nombre')
    password = payload.get('password') or get_random_string(10)
    if not username:
        username = f'empleado{get_random_string(5)}'

    username = make_available_username(username)
    email = payload.get('email', '').strip()

    user = User.objects.create_user(username=username, email=email, password=password, is_active=activo)
    if rol.group:
        user.groups.add(rol.group)
    return user, password


def home_api(request):
    return JsonResponse({
        'message': 'Hola desde Django API (MySQL configurada) - Home',
        'status': 'ok',
    })


@csrf_exempt
def roles_list(request):
    if request.method == 'GET':
        roles = Rol.objects.all()
        data = [rol_to_dict(r) for r in roles]
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        rol = Rol.objects.create(
            nombre=payload.get('nombre', '').strip(),
            descripcion=payload.get('descripcion', '').strip(),
            activo=payload.get('activo', True),
        )
        return JsonResponse(rol_to_dict(rol), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def rol_detail(request, rol_id):
    try:
        rol = Rol.objects.get(id=rol_id)
    except Rol.DoesNotExist:
        return JsonResponse({'error': 'Rol no encontrado'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        if 'nombre' in payload:
            rol.nombre = payload['nombre'].strip()
        if 'descripcion' in payload:
            rol.descripcion = payload['descripcion'].strip()
        if 'activo' in payload:
            rol.activo = payload['activo']

        rol.save()
        return JsonResponse(rol_to_dict(rol))

    if request.method == 'DELETE':
        rol.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


@csrf_exempt
def empleados_list(request):
    if request.method == 'GET':
        empleados = Empleado.objects.select_related('rol', 'user').all()
        data = [empleado_to_dict(e) for e in empleados]
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        try:
            rol = Rol.objects.get(id=payload.get('rol_id'))
        except Rol.DoesNotExist:
            return JsonResponse({'error': 'Rol no encontrado'}, status=400)

        empleado = Empleado(
            nombre=payload.get('nombre', '').strip(),
            rol=rol,
            turno=payload.get('turno', 'manana'),
            telefono=payload.get('telefono', '').strip(),
            email=payload.get('email', '').strip(),
            activo=payload.get('activo', True),
        )

        if payload.get('create_user', True):
            user, password = create_user_for_empleado(payload, rol, activo=empleado.activo)
            empleado.user = user
        empleado.save()

        response = empleado_to_dict(empleado)
        if empleado.user and payload.get('password') is None:
            response['user_password'] = password
        return JsonResponse(response, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def empleado_detail(request, empleado_id):
    try:
        empleado = Empleado.objects.select_related('rol', 'user').get(id=empleado_id)
    except Empleado.DoesNotExist:
        return JsonResponse({'error': 'Empleado no encontrado'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        if 'nombre' in payload:
            empleado.nombre = payload['nombre'].strip()
        if 'rol_id' in payload:
            try:
                empleado.rol = Rol.objects.get(id=payload['rol_id'])
            except Rol.DoesNotExist:
                return JsonResponse({'error': 'Rol no encontrado'}, status=400)
        if 'turno' in payload:
            empleado.turno = payload['turno']
        if 'telefono' in payload:
            empleado.telefono = payload['telefono'].strip()
        if 'email' in payload:
            empleado.email = payload['email'].strip()
            if empleado.user:
                empleado.user.email = empleado.email
                empleado.user.save(update_fields=['email'])
        if 'username' in payload and empleado.user:
            empleado.user.username = payload['username'].strip()
            empleado.user.save(update_fields=['username'])
        if 'password' in payload and empleado.user:
            empleado.user.set_password(payload['password'])
            empleado.user.save(update_fields=['password'])
        if 'activo' in payload:
            empleado.activo = payload['activo']
            if empleado.user:
                empleado.user.is_active = empleado.activo
                empleado.user.save(update_fields=['is_active'])

        empleado.save()
        return JsonResponse(empleado_to_dict(empleado))

    if request.method == 'DELETE':
        empleado.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])
