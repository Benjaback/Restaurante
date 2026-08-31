import json
import re
import uuid
from datetime import date, datetime
from decimal import Decimal
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import EmailValidator
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseNotAllowed
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from .models import AsignacionMesa, AuthToken, Caja, CategoriaPlato, CategoriaProducto, DetallePedido, Empleado, Mesa, MovimientoCaja, Pago, Pedido, Plato, Producto, Produccion, Receta, RecetaProducto, Reserva, Rol, Ticket, Turno


SECUENCIALES = (
    '12345678', '87654321', '123456789', '987654321',
    '11111111', '22222222', '33333333', '44444444',
    '55555555', '66666666', '77777777', '88888888',
    '99999999', '00000000', '1234567', '7654321',
)

def validar_dni(dni):
    if not dni:
        return 'El DNI es obligatorio'
    if not dni.isdigit():
        return 'El DNI debe contener solo números'
    if len(dni) < 6 or len(dni) > 9:
        return 'El DNI debe tener entre 6 y 9 dígitos'
    if len(set(dni)) == 1:
        return 'El DNI no puede ser todos dígitos repetidos'
    secuenciales = ['12345678', '11111111', '22222222', '33333333', '44444444', '55555555', '66666666', '77777777', '88888888', '99999999', '00000000']
    if dni in secuenciales:
        return 'El DNI no puede ser secuencial'
    return None


def validar_fecha_nacimiento(valor):
    if not valor:
        return None  # opcional
    try:
        if isinstance(valor, str):
            fecha = datetime.strptime(valor, '%Y-%m-%d').date()
        else:
            fecha = valor
    except (ValueError, TypeError):
        return 'La fecha de nacimiento no es válida'
    if fecha > date.today():
        return 'La fecha de nacimiento no puede ser posterior a hoy'
    return None


def validar_telefono(valor):
    if not valor:
        return None  # opcional
    limpio = re.sub(r'[\s\-\(\)\+]', '', valor)
    if not limpio.isdigit():
        return 'El teléfono debe contener solo números'
    if len(limpio) < 7:
        return 'El teléfono es demasiado corto'
    if len(limpio) > 15:
        return 'El teléfono es demasiado largo'
    return None

def token_required(view_func):
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'token':
            return JsonResponse({'error': 'Token no proporcionado o formato inválido'}, status=401)
        try:
            token = AuthToken.objects.select_related('user').get(key=parts[1])
        except AuthToken.DoesNotExist:
            return JsonResponse({'error': 'Token inválido'}, status=401)
        if not token.user.is_active:
            return JsonResponse({'error': 'Usuario inactivo'}, status=401)
        request.user = token.user
        request.auth_token = token
        return view_func(request, *args, **kwargs)
    return wrapper

def rol_required(allowed_roles):
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            user = request.user
            if user.is_superuser:
                return view_func(request, *args, **kwargs)
            if not hasattr(user, 'empleado'):
                return JsonResponse({'error': 'Acceso denegado: no tienes un rol asignado'}, status=403)
            if user.empleado.rol.nombre not in allowed_roles:
                return JsonResponse({'error': 'No tienes permisos para esta acción'}, status=403)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return HttpResponseBadRequest('JSON inválido')

    username = payload.get('username', '').strip()
    password = payload.get('password', '')

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'error': 'Credenciales inválidas'}, status=400)

    if not user.is_staff and not user.is_superuser:
        if hasattr(user, 'empleado') and not user.empleado.activo:
            return JsonResponse({'error': 'Tu cuenta de empleado está inactiva'}, status=403)

    token = AuthToken.objects.create(user=user)
    response = {
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        },
    }
    if hasattr(user, 'empleado'):
        response['empleado'] = {
            'id': user.empleado.id,
            'nombre': user.empleado.nombre,
            'rol': user.empleado.rol.nombre,
            'turno': user.empleado.turno.nombre if user.empleado.turno else None,
        }
    return JsonResponse(response)


@csrf_exempt
def register_view(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return HttpResponseBadRequest('JSON inválido')

    username = payload.get('username', '').strip()
    email = payload.get('email', '').strip()
    password = payload.get('password', '')

    if not username or not password:
        return JsonResponse({'error': 'Usuario y contraseña son requeridos'}, status=400)
    try:
        validate_password(password)
    except ValidationError as e:
        return JsonResponse({'error': ' '.join(e.messages)}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'El nombre de usuario ya existe'}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)

    token = AuthToken.objects.create(user=user)
    return JsonResponse({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        },
    }, status=201)


@csrf_exempt
@token_required
def logout_view(request):
    request.auth_token.delete()
    return JsonResponse({'detail': 'Sesión cerrada correctamente'})


@csrf_exempt
@token_required
def me_view(request):
    user = request.user
    empleado = getattr(user, 'empleado', None)
    response = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }
    if empleado:
        response['empleado'] = {
            'id': empleado.id,
            'nombre': empleado.nombre,
            'rol': empleado.rol.nombre,
            'turno': empleado.turno.nombre if empleado.turno else None,
        }
    return JsonResponse(response)


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
        'apellido': empleado.apellido,
        'dni': empleado.dni,
        'fecha_nacimiento': empleado.fecha_nacimiento.isoformat() if empleado.fecha_nacimiento else None,
        'direccion': empleado.direccion,
        'fecha_contratacion': empleado.fecha_contratacion.isoformat() if empleado.fecha_contratacion else None,
        'rol': {
            'id': empleado.rol.id,
            'nombre': empleado.rol.nombre,
        },
        'turno': {
            'id': empleado.turno.id,
            'nombre': empleado.turno.nombre,
            'hora_inicio': empleado.turno.hora_inicio.strftime('%H:%M'),
            'hora_fin': empleado.turno.hora_fin.strftime('%H:%M'),
        } if empleado.turno else None,
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
    dni = payload.get('dni', '').strip()
    if not dni:
        dni = f'empleado{get_random_string(5)}'
    password = get_random_string(12)
    email = payload.get('email', '').strip()

    existing = User.objects.filter(username=dni).first()
    if existing:
        existing.is_active = activo
        existing.set_password(password)
        if email:
            existing.email = email
        existing.save()
        if rol.group:
            existing.groups.set([rol.group])
        return existing, password

    user = User.objects.create_user(username=dni, email=email, password=password, is_active=activo)
    if rol.group:
        user.groups.add(rol.group)
    return user, password


def home_api(request):
    return JsonResponse({
        'message': 'Hola desde Django API (MySQL configurada) - Home',
        'status': 'ok',
    })


@csrf_exempt
@token_required
@rol_required(['Dueño', 'Admin'])
def roles_list(request):
    if request.method == 'GET':
        roles = Rol.objects.filter(activo=True)
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
@token_required
@rol_required(['Dueño', 'Admin'])
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


def turno_to_dict(t):
    return {
        'id': t.id,
        'nombre': t.nombre,
        'hora_inicio': t.hora_inicio.strftime('%H:%M'),
        'hora_fin': t.hora_fin.strftime('%H:%M'),
        'activo': t.activo,
    }


@csrf_exempt
@token_required
@rol_required(['Dueño', 'Admin'])
def turnos_list(request):
    if request.method == 'GET':
        turnos = Turno.objects.all()
        return JsonResponse([turno_to_dict(t) for t in turnos], safe=False)
    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        nombre = payload.get('nombre', '').strip()
        if not nombre:
            return JsonResponse({'error': 'El nombre del turno es obligatorio'}, status=400)
        try:
            turno = Turno.objects.create(
                nombre=nombre,
                hora_inicio=payload.get('hora_inicio'),
                hora_fin=payload.get('hora_fin'),
                activo=payload.get('activo', True),
            )
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
        return JsonResponse(turno_to_dict(turno), status=201)
    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
@rol_required(['Dueño', 'Admin'])
def turno_detail(request, turno_id):
    try:
        turno = Turno.objects.get(id=turno_id)
    except Turno.DoesNotExist:
        return JsonResponse({'error': 'Turno no encontrado'}, status=404)

    if request.method == 'GET':
        return JsonResponse(turno_to_dict(turno))

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        if 'nombre' in payload:
            turno.nombre = payload['nombre'].strip()
        if 'hora_inicio' in payload:
            turno.hora_inicio = payload['hora_inicio']
        if 'hora_fin' in payload:
            turno.hora_fin = payload['hora_fin']
        if 'activo' in payload:
            turno.activo = payload['activo']
        turno.save()
        return JsonResponse(turno_to_dict(turno))

    if request.method == 'DELETE':
        turno.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['GET', 'PATCH', 'DELETE'])


@csrf_exempt
@token_required
def empleados_list(request):
    if request.method == 'GET':
        empleados = Empleado.objects.select_related('rol', 'user').all()
        rol = request.GET.get('rol')
        if rol:
            empleados = empleados.filter(rol__nombre__iexact=rol, activo=True)
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

        nombre = (payload.get('nombre') or '').strip()
        if not nombre:
            return JsonResponse({'error': 'El nombre es obligatorio'}, status=400)

        apellido = (payload.get('apellido') or '').strip()
        if not apellido:
            return JsonResponse({'error': 'El apellido es obligatorio'}, status=400)

        dni = (payload.get('dni') or '').strip()
        error_dni = validar_dni(dni)
        if error_dni:
            return JsonResponse({'error': error_dni}, status=400)

        email = (payload.get('email') or '').strip()
        if not email:
            return JsonResponse({'error': 'El email es obligatorio'}, status=400)
        try:
            EmailValidator()(email)
        except ValidationError:
            return JsonResponse({'error': 'El email no es válido'}, status=400)

        fecha_nacimiento_str = payload.get('fecha_nacimiento') or None
        if not fecha_nacimiento_str:
            return JsonResponse({'error': 'La fecha de nacimiento es obligatoria'}, status=400)
        error_fecha = validar_fecha_nacimiento(fecha_nacimiento_str)
        if error_fecha:
            return JsonResponse({'error': error_fecha}, status=400)
        fecha_nacimiento = datetime.strptime(fecha_nacimiento_str, '%Y-%m-%d').date()

        fecha_contratacion_str = payload.get('fecha_contratacion') or None
        if not fecha_contratacion_str:
            return JsonResponse({'error': 'La fecha de contratación es obligatoria'}, status=400)
        try:
            fecha_contratacion = datetime.strptime(fecha_contratacion_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return JsonResponse({'error': 'La fecha de contratación no es válida'}, status=400)

        telefono = (payload.get('telefono') or '').strip()
        error_tel = validar_telefono(telefono)
        if error_tel:
            return JsonResponse({'error': error_tel}, status=400)

        direccion = (payload.get('direccion') or '').strip()
        if not direccion:
            return JsonResponse({'error': 'La dirección es obligatoria'}, status=400)

        turno_id = payload.get('turno_id')
        if not turno_id:
            return JsonResponse({'error': 'El turno es obligatorio'}, status=400)
        try:
            turno_obj = Turno.objects.get(id=turno_id)
        except (Turno.DoesNotExist, ValueError):
            return JsonResponse({'error': 'Turno no encontrado'}, status=400)

        empleado_existente = Empleado.objects.filter(dni=dni).first()
        if empleado_existente:
            if empleado_existente.activo:
                return JsonResponse({'error': f'Ya existe un empleado activo con DNI {dni}'}, status=400)
            # Reutilizar empleado inactivo: reactivar y actualizar datos
            empleado_existente.nombre = nombre
            empleado_existente.apellido = apellido
            empleado_existente.fecha_nacimiento = fecha_nacimiento
            empleado_existente.fecha_contratacion = fecha_contratacion
            empleado_existente.rol = rol
            empleado_existente.turno = turno_obj
            empleado_existente.telefono = telefono
            empleado_existente.email = email
            empleado_existente.direccion = direccion
            empleado_existente.activo = True
            empleado = empleado_existente
        else:
            if Empleado.objects.filter(email=email, activo=True).exists():
                return JsonResponse({'error': f'Ya existe un empleado activo con email {email}'}, status=400)
            empleado = Empleado(
                nombre=nombre,
                apellido=apellido,
                dni=dni,
                fecha_nacimiento=fecha_nacimiento,
                direccion=direccion,
                fecha_contratacion=fecha_contratacion,
                rol=rol,
                turno=turno_obj,
                telefono=telefono,
                email=email,
                activo=True,
            )

        if payload.get('create_user', True):
            user, password = create_user_for_empleado(payload, rol, activo=True)
            empleado.user = user
        empleado.save()

        if empleado.user and empleado.email:
            try:
                send_mail(
                    subject=f'Credenciales de acceso - {empleado.nombre} {empleado.apellido}',
                    message=(
                        f'Hola {empleado.nombre} {empleado.apellido},\n\n'
                        f'Se han creado tus credenciales para acceder al sistema del restaurante.\n\n'
                        f'Usuario: {empleado.user.username}\n'
                        f'Contraseña: {password}\n\n'
                        f'Ingresá en: http://localhost:3000\n\n'
                        f'Saludos,'
                    ),
                    from_email=None,
                    recipient_list=[empleado.email],
                    fail_silently=False,
                )
            except Exception:
                pass

        response = empleado_to_dict(empleado)
        if empleado.user:
            response['user_password'] = password
        return JsonResponse(response, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
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
            nombre = payload['nombre'].strip()
            if not nombre:
                return JsonResponse({'error': 'El nombre no puede estar vacío'}, status=400)
            empleado.nombre = nombre
        if 'apellido' in payload:
            empleado.apellido = payload['apellido'].strip()
        if 'dni' in payload:
            dni = (payload['dni'] or '').strip()
            error_dni = validar_dni(dni)
            if error_dni:
                return JsonResponse({'error': error_dni}, status=400)
            if Empleado.objects.filter(dni=dni, activo=True).exclude(id=empleado.id).exists():
                return JsonResponse({'error': f'Ya existe otro empleado activo con DNI {dni}'}, status=400)
            empleado.dni = dni
        if 'fecha_nacimiento' in payload:
            val = payload['fecha_nacimiento']
            if val:
                error_fecha = validar_fecha_nacimiento(val)
                if error_fecha:
                    return JsonResponse({'error': error_fecha}, status=400)
                empleado.fecha_nacimiento = datetime.strptime(val, '%Y-%m-%d').date()
            else:
                empleado.fecha_nacimiento = None
        if 'direccion' in payload:
            empleado.direccion = payload['direccion'].strip()
        if 'fecha_contratacion' in payload:
            val = payload['fecha_contratacion']
            if val:
                try:
                    empleado.fecha_contratacion = datetime.strptime(val, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    return JsonResponse({'error': 'La fecha de contratación no es válida'}, status=400)
            else:
                empleado.fecha_contratacion = None
        if 'rol_id' in payload:
            try:
                empleado.rol = Rol.objects.get(id=payload['rol_id'])
            except Rol.DoesNotExist:
                return JsonResponse({'error': 'Rol no encontrado'}, status=400)
        if 'turno_id' in payload:
            tid = payload['turno_id']
            if tid is not None and tid != '':
                try:
                    empleado.turno = Turno.objects.get(id=tid)
                except (Turno.DoesNotExist, ValueError):
                    return JsonResponse({'error': 'Turno no encontrado'}, status=400)
            else:
                empleado.turno = None
        if 'telefono' in payload:
            error_tel = validar_telefono(payload['telefono'])
            if error_tel:
                return JsonResponse({'error': error_tel}, status=400)
            empleado.telefono = payload['telefono'].strip()
        if 'email' in payload:
            email = payload['email'].strip()
            if email:
                try:
                    EmailValidator()(email)
                except ValidationError:
                    return JsonResponse({'error': 'El email no es válido'}, status=400)
                if Empleado.objects.filter(email=email, activo=True).exclude(id=empleado.id).exists():
                    return JsonResponse({'error': f'Ya existe otro empleado activo con email {email}'}, status=400)
            empleado.email = email
            if empleado.user:
                empleado.user.email = empleado.email
                empleado.user.save(update_fields=['email'])
        if 'username' in payload and empleado.user:
            empleado.user.username = payload['username'].strip()
            empleado.user.save(update_fields=['username'])
        if 'password' in payload and empleado.user:
            try:
                validate_password(payload['password'])
            except ValidationError as e:
                return JsonResponse({'error': ' '.join(e.messages)}, status=400)
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


# ─── CATEGORÍAS DE PRODUCTO ───────────────────────

@csrf_exempt
@token_required
def categorias_producto_list(request):
    if request.method == 'GET':
        cats = CategoriaProducto.objects.all()
        return JsonResponse([{'id': c.id, 'nombre': c.nombre, 'activo': c.activo} for c in cats], safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        cat = CategoriaProducto.objects.create(
            nombre=payload.get('nombre', '').strip(),
            activo=payload.get('activo', True),
        )
        return JsonResponse({'id': cat.id, 'nombre': cat.nombre, 'activo': cat.activo}, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def categoria_producto_detail(request, cat_id):
    try:
        cat = CategoriaProducto.objects.get(id=cat_id)
    except CategoriaProducto.DoesNotExist:
        return JsonResponse({'error': 'Categoría no encontrada'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        if 'nombre' in payload:
            cat.nombre = payload['nombre'].strip()
        if 'activo' in payload:
            cat.activo = payload['activo']
        cat.save()
        return JsonResponse({'id': cat.id, 'nombre': cat.nombre, 'activo': cat.activo})

    if request.method == 'DELETE':
        cat.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ─── PRODUCTOS ──────────────────────

def producto_to_dict(p):
    es_elaborado = RecetaProducto.objects.filter(producto_elaborado=p).exists()
    return {
        'id': p.id,
        'nombre': p.nombre,
        'categoria': {'id': p.categoria.id, 'nombre': p.categoria.nombre} if p.categoria else None,
        'stock': float(p.stock),
        'precio_compra': float(p.precio_compra) if p.precio_compra else None,
        'unidad': p.unidad,
        'stock_minimo': float(p.stock_minimo),
        'activo': p.activo,
        'es_elaborado': es_elaborado,
        'fecha_creacion': p.fecha_creacion.isoformat(),
    }


@csrf_exempt
@token_required
def productos_list(request):
    if request.method == 'GET':
        productos = Producto.objects.select_related('categoria').all()
        return JsonResponse([producto_to_dict(p) for p in productos], safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        categoria = None
        if payload.get('categoria_id'):
            try:
                categoria = CategoriaProducto.objects.get(id=payload['categoria_id'])
            except CategoriaProducto.DoesNotExist:
                return JsonResponse({'error': 'Categoría no encontrada'}, status=400)
        p = Producto.objects.create(
            nombre=payload.get('nombre', '').strip(),
            categoria=categoria,
            stock=payload.get('stock', 0),
            precio_compra=payload['precio_compra'] if payload.get('precio_compra') not in (None, '') else None,
            unidad=payload.get('unidad', 'unidad'),
            stock_minimo=payload.get('stock_minimo', 0),
            activo=payload.get('activo', True),
        )
        return JsonResponse(producto_to_dict(p), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def producto_detail(request, producto_id):
    try:
        p = Producto.objects.select_related('categoria').get(id=producto_id)
    except Producto.DoesNotExist:
        return JsonResponse({'error': 'Producto no encontrado'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        if 'nombre' in payload:
            p.nombre = payload['nombre'].strip()
        if 'categoria_id' in payload:
            try:
                p.categoria = CategoriaProducto.objects.get(id=payload['categoria_id'])
            except CategoriaProducto.DoesNotExist:
                return JsonResponse({'error': 'Categoría no encontrada'}, status=400)
        if 'stock' in payload:
            try:
                p.stock = Decimal(str(payload['stock']))
            except Exception:
                return JsonResponse({'error': 'Valor de stock inválido'}, status=400)
        if 'precio_compra' in payload:
            p.precio_compra = payload['precio_compra'] if payload['precio_compra'] not in (None, '') else None
        if 'unidad' in payload:
            p.unidad = payload['unidad']
        if 'stock_minimo' in payload:
            p.stock_minimo = payload['stock_minimo']
        if 'activo' in payload:
            p.activo = payload['activo']
        if p.stock <= 0 and p.activo:
            p.activo = False
            desactivar_platos_por_producto(p)
        p.save()
        return JsonResponse(producto_to_dict(p))

    if request.method == 'DELETE':
        p.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


@csrf_exempt
@token_required
def producto_usos(request, producto_id):
    try:
        producto = Producto.objects.get(id=producto_id)
    except Producto.DoesNotExist:
        return JsonResponse({'error': 'Producto no encontrado'}, status=404)
    usos = Receta.objects.filter(producto=producto).select_related('plato__categoria')
    platos = []
    for r in usos:
        platos.append({
            'id': r.plato.id,
            'nombre': r.plato.nombre,
            'categoria': r.plato.categoria.nombre if r.plato.categoria else None,
            'precio': float(r.plato.precio),
            'activo': r.plato.activo,
            'cantidad': float(r.cantidad),
        })
    return JsonResponse(platos, safe=False)


# ─── CATEGORÍAS DE PLATO ─────────────────────────────────────────

@csrf_exempt
@token_required
def categorias_plato_list(request):
    if request.method == 'GET':
        cats = CategoriaPlato.objects.all()
        return JsonResponse([{'id': c.id, 'nombre': c.nombre, 'activo': c.activo} for c in cats], safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        cat = CategoriaPlato.objects.create(
            nombre=payload.get('nombre', '').strip(),
            activo=payload.get('activo', True),
        )
        return JsonResponse({'id': cat.id, 'nombre': cat.nombre, 'activo': cat.activo}, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def categoria_plato_detail(request, cat_id):
    try:
        cat = CategoriaPlato.objects.get(id=cat_id)
    except CategoriaPlato.DoesNotExist:
        return JsonResponse({'error': 'Categoría no encontrada'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        if 'nombre' in payload:
            cat.nombre = payload['nombre'].strip()
        if 'activo' in payload:
            cat.activo = payload['activo']
        cat.save()
        return JsonResponse({'id': cat.id, 'nombre': cat.nombre, 'activo': cat.activo})

    if request.method == 'DELETE':
        cat.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ─── PLATOS ─────────────────────────────────────────

def receta_to_dict(r):
    return {
        'id': r.id,
        'producto_id': r.producto_id,
        'producto_nombre': r.producto.nombre,
        'producto_unidad': r.producto.unidad,
        'producto_precio': float(r.producto.precio_compra) if r.producto.precio_compra else None,
        'cantidad': float(r.cantidad),
    }


def plato_to_dict(p):
    recetas = p.recetas.select_related('producto').all()
    costo_total = sum(
        float(r.cantidad) * float(r.producto.precio_compra)
        for r in recetas
        if r.producto.precio_compra
    )
    return {
        'id': p.id,
        'nombre': p.nombre,
        'precio': float(p.precio),
        'costo': round(costo_total, 2) if costo_total else None,
        'categoria': {'id': p.categoria.id, 'nombre': p.categoria.nombre} if p.categoria else None,
        'descripcion': p.descripcion,
        'imagen': p.imagen or '',
        'activo': p.activo,
        'fecha_creacion': p.fecha_creacion.isoformat(),
        'recetas': [receta_to_dict(r) for r in recetas],
    }


@csrf_exempt
def platos_list(request):
    if request.method == 'GET':
        platos = Plato.objects.prefetch_related('recetas__producto').all()
        return JsonResponse([plato_to_dict(p) for p in platos], safe=False)

    if request.method == 'POST':
        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'token':
            return JsonResponse({'error': 'Token no proporcionado'}, status=401)
        try:
            token = AuthToken.objects.select_related('user').get(key=parts[1])
        except AuthToken.DoesNotExist:
            return JsonResponse({'error': 'Token inválido'}, status=401)
        if not token.user.is_active:
            return JsonResponse({'error': 'Usuario inactivo'}, status=401)
        user = token.user
        if not user.is_superuser and (not hasattr(user, 'empleado') or user.empleado.rol.nombre not in ('Dueño', 'Admin', 'Cocinero')):
            return JsonResponse({'error': 'No tienes permisos para crear platos'}, status=403)
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        categoria = None
        if payload.get('categoria_id'):
            try:
                categoria = CategoriaPlato.objects.get(id=payload['categoria_id'])
            except CategoriaPlato.DoesNotExist:
                return JsonResponse({'error': 'Categoría no encontrada'}, status=400)

        plato = Plato.objects.create(
            nombre=payload.get('nombre', '').strip(),
            precio=payload.get('precio', 0),
            categoria=categoria,
            descripcion=payload.get('descripcion', '').strip(),
            imagen=payload.get('imagen', '').strip(),
            activo=payload.get('activo', True),
        )

        seen = {}
        for item in payload.get('recetas', []):
            pid = item['producto_id']
            if pid in seen:
                seen[pid] += float(item.get('cantidad', 0))
            else:
                seen[pid] = float(item.get('cantidad', 0))
        for producto_id, cantidad in seen.items():
            try:
                producto = Producto.objects.get(id=producto_id)
            except Producto.DoesNotExist:
                continue
            Receta.objects.create(
                plato=plato,
                producto=producto,
                cantidad=cantidad,
            )

        return JsonResponse(plato_to_dict(plato), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def plato_detail(request, plato_id):
    try:
        plato = Plato.objects.prefetch_related('recetas__producto').get(id=plato_id)
    except Plato.DoesNotExist:
        return JsonResponse({'error': 'Plato no encontrado'}, status=404)

    if request.method == 'PATCH':
        if not request.user.is_superuser and (not hasattr(request.user, 'empleado') or request.user.empleado.rol.nombre not in ('Dueño', 'Admin')):
            return JsonResponse({'error': 'No tienes permisos para editar platos'}, status=403)
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        if 'nombre' in payload:
            plato.nombre = payload['nombre'].strip()
        if 'precio' in payload:
            plato.precio = payload['precio']
        if 'categoria_id' in payload:
            try:
                plato.categoria = CategoriaPlato.objects.get(id=payload['categoria_id'])
            except CategoriaPlato.DoesNotExist:
                return JsonResponse({'error': 'Categoría no encontrada'}, status=400)
        if 'descripcion' in payload:
            plato.descripcion = payload['descripcion'].strip()
        if 'imagen' in payload:
            plato.imagen = payload['imagen'].strip()
        if 'activo' in payload:
            if payload['activo']:
                productos_inactivos = [
                    r.producto.nombre for r in plato.recetas.all()
                    if not r.producto.activo
                ]
                if productos_inactivos:
                    return JsonResponse({
                        'error': 'No hay productos disponibles',
                        'detalles': f'Productos inactivos: {", ".join(productos_inactivos)}',
                    }, status=400)
            plato.activo = payload['activo']
        if 'recetas' in payload:
            plato.recetas.all().delete()
            seen = {}
            for item in payload['recetas']:
                pid = item['producto_id']
                if pid in seen:
                    seen[pid] += float(item.get('cantidad', 0))
                else:
                    seen[pid] = float(item.get('cantidad', 0))
            for producto_id, cantidad in seen.items():
                try:
                    producto = Producto.objects.get(id=producto_id)
                except Producto.DoesNotExist:
                    continue
                Receta.objects.create(
                    plato=plato,
                    producto=producto,
                    cantidad=cantidad,
                )
        plato.save()
        return JsonResponse(plato_to_dict(plato))

    if request.method == 'DELETE':
        if not request.user.is_superuser and (not hasattr(request.user, 'empleado') or request.user.empleado.rol.nombre not in ('Dueño', 'Admin')):
            return JsonResponse({'error': 'No tienes permisos para eliminar platos'}, status=403)
        plato.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


def desactivar_platos_por_producto(producto):
    recetas = Receta.objects.filter(producto=producto).select_related('plato')
    platos_desactivados = []
    for r in recetas:
        if r.plato.activo:
            r.plato.activo = False
            r.plato.save(update_fields=['activo'])
            platos_desactivados.append(r.plato.nombre)
    return platos_desactivados


# ─── ORDENAR (consume el stock) ─────────────────────

@csrf_exempt
@token_required
def ordenar_view(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return HttpResponseBadRequest('JSON inválido')

    plato_id = payload.get('plato_id')
    cantidad = int(payload.get('cantidad', 1))

    try:
        plato = Plato.objects.get(id=plato_id, activo=True)
    except Plato.DoesNotExist:
        return JsonResponse({'error': 'Plato no encontrado o inactivo'}, status=404)

    recetas = Receta.objects.filter(plato=plato).select_related('producto')
    if not recetas:
        return JsonResponse({'error': 'El plato no tiene recetas'}, status=400)

    errores = []
    for r in recetas:
        necesario = r.cantidad * cantidad
        if r.producto.stock < necesario:
            errores.append(f'Stock insuficiente de {r.producto.nombre}: disponible {r.producto.stock} {r.producto.unidad}, necesario {necesario} {r.producto.unidad}')

    if errores:
        return JsonResponse({'error': 'Stock insuficiente', 'detalles': errores}, status=400)

    productos_desactivados = []
    platos_desactivados = []
    for r in recetas:
        necesario = r.cantidad * cantidad
        r.producto.stock -= necesario
        update_fields = ['stock']
        if r.producto.stock <= 0 and r.producto.activo:
            r.producto.activo = False
            update_fields.append('activo')
            productos_desactivados.append(r.producto.nombre)
            platos_desactivados.extend(desactivar_platos_por_producto(r.producto))
        r.producto.save(update_fields=update_fields)

    response = {
        'mensaje': f'{cantidad}x {plato.nombre} ordenado(s) correctamente',
        'plato': plato.nombre,
        'cantidad': cantidad,
    }
    if productos_desactivados:
        response['productos_desactivados'] = list(set(productos_desactivados))
    if platos_desactivados:
        response['platos_desactivados'] = list(set(platos_desactivados))
    return JsonResponse(response)


# ── RecetaProducto ───────────────

def receta_producto_to_dict(rp):
    return {
        'id': rp.id,
        'producto_elaborado': rp.producto_elaborado.id,
        'producto_elaborado_nombre': rp.producto_elaborado.nombre,
        'producto_insumo': rp.producto_insumo.id,
        'producto_insumo_nombre': rp.producto_insumo.nombre,
        'producto_insumo_unidad': rp.producto_insumo.unidad,
        'producto_insumo_stock': float(rp.producto_insumo.stock),
        'cantidad': float(rp.cantidad),
    }


@csrf_exempt
@token_required
def recetas_producto_list(request):
    if request.method == 'GET':
        rps = RecetaProducto.objects.select_related('producto_elaborado', 'producto_insumo').all()
        data = {}
        for rp in rps:
            pid = rp.producto_elaborado.id
            if pid not in data:
                elaborado = rp.producto_elaborado
                data[pid] = {
                    'producto_id': elaborado.id,
                    'producto_nombre': elaborado.nombre,
                    'producto_unidad': elaborado.unidad,
                    'producto_stock': float(elaborado.stock),
                    'receta': [],
                }
            data[pid]['receta'].append(receta_producto_to_dict(rp))
        return JsonResponse(list(data.values()), safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        producto_elaborado_id = body.get('producto_elaborado')
        insumos = body.get('insumos', [])  # [{"producto_insumo": id, "cantidad": n}, ...]

        if not producto_elaborado_id or not insumos:
            return JsonResponse({'error': 'Faltan producto_elaborado o insumos'}, status=400)

        creadas = []
        for ins in insumos:
            rp, created = RecetaProducto.objects.get_or_create(
                producto_elaborado_id=producto_elaborado_id,
                producto_insumo_id=ins['producto_insumo'],
                defaults={'cantidad': ins['cantidad']},
            )
            if not created:
                rp.cantidad = ins['cantidad']
                rp.save()
            creadas.append(receta_producto_to_dict(rp))

        return JsonResponse({'receta': creadas}, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def receta_producto_detail(request, receta_id):
    try:
        rp = RecetaProducto.objects.select_related('producto_elaborado', 'producto_insumo').get(id=receta_id)
    except RecetaProducto.DoesNotExist:
        return JsonResponse({'error': 'No encontrada'}, status=404)

    if request.method == 'DELETE':
        rp.delete()
        return JsonResponse({'mensaje': 'Eliminada'}, status=200)

    if request.method == 'PATCH':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        if 'cantidad' in body:
            rp.cantidad = body['cantidad']
        if 'producto_insumo' in body:
            rp.producto_insumo_id = body['producto_insumo']
        rp.save()
        return JsonResponse(receta_producto_to_dict(rp))

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ── Produccion ──────────────────────

def produccion_to_dict(p):
    return {
        'id': p.id,
        'producto_id': p.producto.id,
        'producto_nombre': p.producto.nombre,
        'cantidad': float(p.cantidad),
        'fecha': p.fecha.isoformat(),
        'descripcion': p.descripcion,
    }


@csrf_exempt
@token_required
def producciones_list(request):
    if request.method == 'GET':
        prods = Produccion.objects.select_related('producto').all()[:100]
        return JsonResponse([produccion_to_dict(p) for p in prods], safe=False)

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        producto_id = body.get('producto_id')
        cantidad = Decimal(str(body.get('cantidad', 1)))
        descripcion = body.get('descripcion', '')

        try:
            producto = Producto.objects.get(id=producto_id)
        except Producto.DoesNotExist:
            return JsonResponse({'error': 'Producto no encontrado'}, status=404)

        insumos = RecetaProducto.objects.filter(producto_elaborado=producto).select_related('producto_insumo')
        if not insumos.exists():
            return JsonResponse({'error': 'El producto no tiene una receta de elaboración'}, status=400)

        errores = []
        for ins in insumos:
            necesario = ins.cantidad * cantidad
            if ins.producto_insumo.stock < necesario:
                errores.append(
                    f'{ins.producto_insumo.nombre}: necesario {necesario} {ins.producto_insumo.unidad}, '
                    f'disponible {ins.producto_insumo.stock}'
                )
        if errores:
            return JsonResponse({'error': 'Stock insuficiente', 'detalles': errores}, status=400)

        for ins in insumos:
            necesario = ins.cantidad * cantidad
            ins.producto_insumo.stock -= necesario
            update = ['stock']
            if ins.producto_insumo.stock <= 0 and ins.producto_insumo.activo:
                ins.producto_insumo.activo = False
                update.append('activo')
                desactivar_platos_por_producto(ins.producto_insumo)
            ins.producto_insumo.save(update_fields=update)

        producto.stock += cantidad
        producto.save(update_fields=['stock'])

        prod = Produccion.objects.create(
            producto=producto,
            cantidad=cantidad,
            descripcion=descripcion,
        )

        return JsonResponse(produccion_to_dict(prod), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


# ─── MESAS ─────────────────────────────────────────────────────────────────────

def mesa_to_dict(m):
    return {
        'id': m.id,
        'numero': m.numero,
        'capacidad': m.capacidad,
        'activa': m.activa,
    }


@csrf_exempt
@token_required
def mesas_list(request):
    if request.method == 'GET':
        mesas = Mesa.objects.all()
        return JsonResponse([mesa_to_dict(m) for m in mesas], safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        numero = payload.get('numero')
        if numero is None:
            return JsonResponse({'error': 'El número de mesa es obligatorio'}, status=400)
        if Mesa.objects.filter(numero=numero).exists():
            return JsonResponse({'error': f'Ya existe la mesa {numero}'}, status=400)
        mesa = Mesa.objects.create(
            numero=numero,
            capacidad=payload.get('capacidad', 4),
        )
        return JsonResponse(mesa_to_dict(mesa), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def mesa_detail(request, mesa_id):
    try:
        mesa = Mesa.objects.get(id=mesa_id)
    except Mesa.DoesNotExist:
        return JsonResponse({'error': 'Mesa no encontrada'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        if 'numero' in payload:
            n = payload['numero']
            if Mesa.objects.filter(numero=n).exclude(id=mesa.id).exists():
                return JsonResponse({'error': f'Ya existe la mesa {n}'}, status=400)
            mesa.numero = n
        if 'capacidad' in payload:
            mesa.capacidad = payload['capacidad']
        if 'activa' in payload:
            mesa.activa = payload['activa']
        mesa.save()
        return JsonResponse(mesa_to_dict(mesa))

    if request.method == 'DELETE':
        mesa.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ─── ASIGNACIONES DE MESA ──────────────────────────────────────────────────────

def asignacion_to_dict(a):
    return {
        'id': a.id,
        'mesa_id': a.mesa_id,
        'mesa_numero': a.mesa.numero,
        'mesa_capacidad': a.mesa.capacidad,
        'empleado_id': a.empleado_id,
        'empleado_nombre': f'{a.empleado.nombre} {a.empleado.apellido}',
        'turno_id': a.turno_id,
        'turno_nombre': a.turno.nombre,
        'fecha': a.fecha.isoformat(),
    }


@csrf_exempt
@token_required
def asignaciones_list(request):
    if request.method == 'GET':
        fecha = request.GET.get('fecha')
        turno_id = request.GET.get('turno_id')
        qs = AsignacionMesa.objects.select_related('mesa', 'empleado', 'turno').all()
        if fecha:
            qs = qs.filter(fecha=fecha)
        if turno_id:
            qs = qs.filter(turno_id=turno_id)
        return JsonResponse([asignacion_to_dict(a) for a in qs], safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        mesa_id = payload.get('mesa_id')
        emp_id = payload.get('empleado_id')
        turno_id = payload.get('turno_id')
        fecha = payload.get('fecha')
        if not mesa_id or not emp_id or not turno_id or not fecha:
            return JsonResponse({'error': 'Faltan campos requeridos'}, status=400)
        if AsignacionMesa.objects.filter(mesa_id=mesa_id, turno_id=turno_id, fecha=fecha).exists():
            return JsonResponse({'error': 'Ya hay una asignación para esa mesa en ese turno y fecha'}, status=400)
        try:
            from datetime import date
            fecha_obj = date.fromisoformat(fecha)
        except (ValueError, TypeError):
            return JsonResponse({'error': 'Fecha no válida'}, status=400)
        try:
            empleado = Empleado.objects.get(id=emp_id, activo=True, rol__nombre='Mesero')
        except Empleado.DoesNotExist:
            return JsonResponse({'error': 'El empleado no es un mesero activo'}, status=400)
        a = AsignacionMesa.objects.create(
            mesa_id=mesa_id,
            empleado=empleado,
            turno_id=turno_id,
            fecha=fecha_obj,
        )
        return JsonResponse(asignacion_to_dict(a), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def asignacion_detail(request, asignacion_id):
    try:
        a = AsignacionMesa.objects.select_related('mesa', 'empleado', 'turno').get(id=asignacion_id)
    except AsignacionMesa.DoesNotExist:
        return JsonResponse({'error': 'Asignación no encontrada'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')
        if 'empleado_id' in payload:
            try:
                empleado = Empleado.objects.get(id=payload['empleado_id'], activo=True, rol__nombre='Mesero')
            except Empleado.DoesNotExist:
                return JsonResponse({'error': 'El empleado no es un mesero activo'}, status=400)
            a.empleado = empleado
        if 'turno_id' in payload:
            a.turno_id = payload['turno_id']
        if 'fecha' in payload:
            try:
                a.fecha = date.fromisoformat(payload['fecha'])
            except (ValueError, TypeError):
                return JsonResponse({'error': 'Fecha no válida'}, status=400)
        a.save()
        return JsonResponse(asignacion_to_dict(a))

    if request.method == 'DELETE':
        a.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ─── PEDIDOS ────────────────────────────────────────────────────────────────────

def pedido_to_dict(p):
    return {
        'id': p.id,
        'mesa_id': p.mesa_id,
        'mesa_numero': p.mesa.numero,
        'empleado_id': p.empleado_id,
        'empleado_nombre': f'{p.empleado.nombre} {p.empleado.apellido}',
        'estado': p.estado,
        'total': float(p.total),
        'fecha_creacion': p.fecha_creacion.isoformat(),
        'fecha_cierre': p.fecha_cierre.isoformat() if p.fecha_cierre else None,
        'detalles': [],
    }


def detalle_to_dict(d):
    return {
        'id': d.id,
        'plato_id': d.plato_id,
        'plato_nombre': d.plato.nombre,
        'cantidad': d.cantidad,
        'precio_unitario': float(d.precio_unitario),
        'subtotal': float(d.subtotal),
    }


@csrf_exempt
@token_required
def pedidos_list(request):
    if request.method == 'GET':
        estado = request.GET.get('estado')
        mesa_id = request.GET.get('mesa_id')
        qs = Pedido.objects.select_related('mesa', 'empleado').prefetch_related('detalles__plato').all()
        if estado:
            qs = qs.filter(estado=estado)
        if mesa_id:
            qs = qs.filter(mesa_id=mesa_id)
        data = []
        for p in qs:
            d = pedido_to_dict(p)
            d['detalles'] = [detalle_to_dict(det) for det in p.detalles.all()]
            data.append(d)
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        if not Caja.objects.filter(activa=True).exists():
            return JsonResponse({'error': 'No hay una caja abierta. Abrí la caja antes de crear pedidos.'}, status=400)

        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        mesa_id = payload.get('mesa_id')
        empleado_id = payload.get('empleado_id')
        if not mesa_id or not empleado_id:
            return JsonResponse({'error': 'mesa_id y empleado_id son requeridos'}, status=400)

        try:
            mesa = Mesa.objects.get(id=mesa_id, activa=True)
        except Mesa.DoesNotExist:
            return JsonResponse({'error': 'Mesa no encontrada o inactiva'}, status=400)

        try:
            empleado = Empleado.objects.get(id=empleado_id, activo=True)
        except Empleado.DoesNotExist:
            return JsonResponse({'error': 'Empleado no encontrado o inactivo'}, status=400)

        pedido = Pedido.objects.create(mesa=mesa, empleado=empleado)
        total = 0
        for item in payload.get('detalles', []):
            plato_id = item.get('plato_id')
            cantidad = int(item.get('cantidad', 1))
            try:
                plato = Plato.objects.get(id=plato_id, activo=True)
            except Plato.DoesNotExist:
                return JsonResponse({'error': f'Plato {plato_id} no encontrado o inactivo'}, status=400)
            precio = plato.precio
            subtotal = float(precio) * cantidad
            DetallePedido.objects.create(
                pedido=pedido,
                plato=plato,
                cantidad=cantidad,
                precio_unitario=precio,
                subtotal=subtotal,
            )
            total += subtotal

        pedido.total = total
        pedido.save(update_fields=['total'])

        result = pedido_to_dict(pedido)
        result['detalles'] = [detalle_to_dict(d) for d in pedido.detalles.all()]
        return JsonResponse(result, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def pedido_detail(request, pedido_id):
    try:
        pedido = Pedido.objects.select_related('mesa', 'empleado').prefetch_related('detalles__plato').get(id=pedido_id)
    except Pedido.DoesNotExist:
        return JsonResponse({'error': 'Pedido no encontrado'}, status=404)

    if request.method == 'GET':
        result = pedido_to_dict(pedido)
        result['detalles'] = [detalle_to_dict(d) for d in pedido.detalles.all()]
        return JsonResponse(result)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        if 'estado' in payload:
            nuevo_estado = payload['estado']
            if nuevo_estado not in dict(Pedido.ESTADOS):
                return JsonResponse({'error': f'Estado inválido: {nuevo_estado}'}, status=400)
            pedido.estado = nuevo_estado
            if nuevo_estado == 'pagado':
                from django.utils import timezone
                pedido.fecha_cierre = timezone.now()

        if 'detalles' in payload:
            pedido.detalles.all().delete()
            total = 0
            for item in payload['detalles']:
                plato_id = item.get('plato_id')
                cantidad = int(item.get('cantidad', 1))
                try:
                    plato = Plato.objects.get(id=plato_id, activo=True)
                except Plato.DoesNotExist:
                    return JsonResponse({'error': f'Plato {plato_id} no encontrado'}, status=400)
                precio = plato.precio
                subtotal = float(precio) * cantidad
                DetallePedido.objects.create(
                    pedido=pedido,
                    plato=plato,
                    cantidad=cantidad,
                    precio_unitario=precio,
                    subtotal=subtotal,
                )
                total += subtotal
            pedido.total = total

        pedido.save()
        result = pedido_to_dict(pedido)
        result['detalles'] = [detalle_to_dict(d) for d in pedido.detalles.all()]
        return JsonResponse(result)

    if request.method == 'DELETE':
        pedido.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['GET', 'PATCH', 'DELETE'])


# ─── CONFIRMAR PEDIDO (consume stock y cambia a en_preparacion) ───────────────

@csrf_exempt
@token_required
def confirmar_pedido_view(request, pedido_id):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    try:
        pedido = Pedido.objects.prefetch_related('detalles__plato__recetas__producto').get(id=pedido_id)
    except Pedido.DoesNotExist:
        return JsonResponse({'error': 'Pedido no encontrado'}, status=404)

    if pedido.estado != 'abierto':
        return JsonResponse({'error': f'El pedido está en estado "{pedido.estado}", no se puede confirmar'}, status=400)

    errores = []
    for det in pedido.detalles.all():
        recetas = Receta.objects.filter(plato=det.plato).select_related('producto')
        for r in recetas:
            necesario = r.cantidad * det.cantidad
            if r.producto.stock < necesario:
                errores.append(
                    f'{det.plato.nombre}: stock insuficiente de {r.producto.nombre} '
                    f'(disp: {r.producto.stock} {r.producto.unidad}, nec: {necesario})'
                )

    if errores:
        return JsonResponse({'error': 'Stock insuficiente', 'detalles': errores}, status=400)

    for det in pedido.detalles.all():
        recetas = Receta.objects.filter(plato=det.plato).select_related('producto')
        for r in recetas:
            necesario = r.cantidad * det.cantidad
            r.producto.stock -= necesario
            update_fields = ['stock']
            if r.producto.stock <= 0 and r.producto.activo:
                r.producto.activo = False
                update_fields.append('activo')
                desactivar_platos_por_producto(r.producto)
            r.producto.save(update_fields=update_fields)

    pedido.estado = 'en_preparacion'
    pedido.save(update_fields=['estado'])

    return JsonResponse({'mensaje': f'Pedido #{pedido.id} confirmado y enviado a cocina', 'estado': pedido.estado})


# ─── PAGOS ──────────────────────────────────────────────────────────────────────

@csrf_exempt
@token_required
def pagos_list(request):
    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        pedido_id = payload.get('pedido_id')
        monto = payload.get('monto')
        metodo = payload.get('metodo')
        vuelto = payload.get('vuelto', 0)

        if not pedido_id or not monto or not metodo:
            return JsonResponse({'error': 'pedido_id, monto y metodo son requeridos'}, status=400)
        if metodo not in dict(Pago.METODOS):
            return JsonResponse({'error': f'Método de pago inválido: {metodo}'}, status=400)

        try:
            pedido = Pedido.objects.get(id=pedido_id)
        except Pedido.DoesNotExist:
            return JsonResponse({'error': 'Pedido no encontrado'}, status=404)

        if pedido.estado not in ('cerrado', 'servido'):
            return JsonResponse({'error': f'El pedido debe estar "cerrado" o "servido", actual: "{pedido.estado}"'}, status=400)

        if hasattr(pedido, 'pago'):
            return JsonResponse({'error': 'El pedido ya tiene un pago registrado'}, status=400)

        pago = Pago.objects.create(
            pedido=pedido,
            monto=monto,
            metodo=metodo,
            vuelto=vuelto if vuelto else 0,
        )

        pedido.estado = 'pagado'
        from django.utils import timezone
        pedido.fecha_cierre = timezone.now()
        pedido.save(update_fields=['estado', 'fecha_cierre'])

        Ticket.objects.create(pedido=pedido, total=pedido.total)

        # Registrar en caja activa
        caja_activa = Caja.objects.filter(activa=True).first()
        if caja_activa:
            MovimientoCaja.objects.create(
                caja=caja_activa,
                tipo='ingreso',
                monto=monto,
                referencia=f'Pedido #{pedido.id}',
                descripcion=f'Pago con {dict(Pago.METODOS).get(metodo, metodo)}',
            )

        return JsonResponse({
            'id': pago.id,
            'pedido_id': pago.pedido_id,
            'monto': float(pago.monto),
            'metodo': pago.metodo,
            'vuelto': float(pago.vuelto),
            'fecha': pago.fecha.isoformat(),
            'ticket_id': pedido.ticket.id,
        }, status=201)

    return HttpResponseNotAllowed(['POST'])


# ─── TICKETS ───────────────────────────────────────────────────────────────────

@csrf_exempt
@token_required
def tickets_list(request):
    if request.method == 'GET':
        pedido_id = request.GET.get('pedido_id')
        qs = Ticket.objects.select_related('pedido__mesa', 'pedido__empleado').all()
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)
        data = []
        for t in qs:
            data.append({
                'id': t.id,
                'pedido_id': t.pedido_id,
                'mesa_numero': t.pedido.mesa.numero,
                'empleado_nombre': f'{t.pedido.empleado.nombre} {t.pedido.empleado.apellido}',
                'total': float(t.total),
                'fecha_emision': t.fecha_emision.isoformat(),
            })
        return JsonResponse(data, safe=False)

    return HttpResponseNotAllowed(['GET'])


# ─── CAJA ──────────────────────────────────────────────────────────────────────

@csrf_exempt
@token_required
def cajas_list(request):
    if request.method == 'GET':
        qs = Caja.objects.select_related('empleado_apertura', 'empleado_cierre').all()
        data = []
        for c in qs:
            ingresos = sum(float(m.monto) for m in c.movimientos.filter(tipo='ingreso'))
            egresos = sum(float(m.monto) for m in c.movimientos.filter(tipo='egreso'))
            data.append({
                'id': c.id,
                'empleado_apertura': f'{c.empleado_apertura.nombre} {c.empleado_apertura.apellido}',
                'empleado_cierre': f'{c.empleado_cierre.nombre} {c.empleado_cierre.apellido}' if c.empleado_cierre else None,
                'fecha_apertura': c.fecha_apertura.isoformat(),
                'fecha_cierre': c.fecha_cierre.isoformat() if c.fecha_cierre else None,
                'monto_inicial': float(c.monto_inicial),
                'monto_final': float(c.monto_final) if c.monto_final else None,
                'activa': c.activa,
                'ingresos': ingresos,
                'egresos': egresos,
            })
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        empleado_id = payload.get('empleado_id')
        monto_inicial = payload.get('monto_inicial', 0)
        if not empleado_id:
            return JsonResponse({'error': 'empleado_id es requerido'}, status=400)

        # Cerrar cajas activas anteriores
        Caja.objects.filter(activa=True).update(activa=False)

        try:
            empleado = Empleado.objects.get(id=empleado_id, activo=True)
        except Empleado.DoesNotExist:
            return JsonResponse({'error': 'Empleado no encontrado'}, status=400)

        caja = Caja.objects.create(
            empleado_apertura=empleado,
            monto_inicial=monto_inicial,
        )
        return JsonResponse({
            'id': caja.id,
            'fecha_apertura': caja.fecha_apertura.isoformat(),
            'monto_inicial': float(caja.monto_inicial),
            'activa': caja.activa,
        }, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def caja_detail(request, caja_id):
    try:
        caja = Caja.objects.select_related('empleado_apertura', 'empleado_cierre').get(id=caja_id)
    except Caja.DoesNotExist:
        return JsonResponse({'error': 'Caja no encontrada'}, status=404)

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        if 'cerrar' in payload and payload['cerrar']:
            empleado_id = payload.get('empleado_cierre_id')
            if not empleado_id:
                return JsonResponse({'error': 'empleado_cierre_id es requerido'}, status=400)
            try:
                empleado = Empleado.objects.get(id=empleado_id, activo=True)
            except Empleado.DoesNotExist:
                return JsonResponse({'error': 'Empleado no encontrado'}, status=400)

            from django.utils import timezone
            caja.empleado_cierre = empleado
            caja.fecha_cierre = timezone.now()
            caja.monto_final = payload.get('monto_final', 0)
            caja.activa = False
            caja.save()
            return JsonResponse({'mensaje': 'Caja cerrada correctamente'})

        if 'monto_inicial' in payload:
            caja.monto_inicial = payload['monto_inicial']
        caja.save()
        return JsonResponse({'id': caja.id, 'monto_inicial': float(caja.monto_inicial), 'activa': caja.activa})

    if request.method == 'DELETE':
        caja.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ─── MOVIMIENTOS DE CAJA ──────────────────────────────────────────────────────

@csrf_exempt
@token_required
def movimientos_caja_list(request):
    if request.method == 'GET':
        caja_id = request.GET.get('caja_id')
        qs = MovimientoCaja.objects.select_related('caja').all()
        if caja_id:
            qs = qs.filter(caja_id=caja_id)
        data = [{
            'id': m.id,
            'caja_id': m.caja_id,
            'tipo': m.tipo,
            'monto': float(m.monto),
            'referencia': m.referencia,
            'descripcion': m.descripcion,
            'fecha': m.fecha.isoformat(),
        } for m in qs]
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        caja_id = payload.get('caja_id')
        tipo = payload.get('tipo')
        monto = payload.get('monto')

        if not caja_id or not tipo or not monto:
            return JsonResponse({'error': 'caja_id, tipo y monto son requeridos'}, status=400)
        if tipo not in ['ingreso', 'egreso']:
            return JsonResponse({'error': 'tipo debe ser "ingreso" o "egreso"'}, status=400)

        try:
            caja = Caja.objects.get(id=caja_id, activa=True)
        except Caja.DoesNotExist:
            return JsonResponse({'error': 'Caja no encontrada o no está activa'}, status=400)

        m = MovimientoCaja.objects.create(
            caja=caja,
            tipo=tipo,
            monto=monto,
            referencia=payload.get('referencia', ''),
            descripcion=payload.get('descripcion', ''),
        )
        return JsonResponse({
            'id': m.id,
            'caja_id': m.caja_id,
            'tipo': m.tipo,
            'monto': float(m.monto),
            'referencia': m.referencia,
            'descripcion': m.descripcion,
            'fecha': m.fecha.isoformat(),
        }, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


# ─── RESERVAS ──────────────────────────────────────────────────────────────────

def reserva_to_dict(r):
    return {
        'id': r.id,
        'nombre_cliente': r.nombre_cliente,
        'telefono': r.telefono,
        'email': r.email,
        'fecha': r.fecha.isoformat(),
        'hora': r.hora.strftime('%H:%M'),
        'personas': r.personas,
        'mesa_id': r.mesa_id,
        'mesa_numero': r.mesa.numero if r.mesa else None,
        'estado': r.estado,
        'empleado_id': r.empleado_id,
        'empleado_nombre': f'{r.empleado.nombre} {r.empleado.apellido}' if r.empleado else None,
        'notas': r.notas,
        'fecha_creacion': r.fecha_creacion.isoformat(),
    }


@csrf_exempt
@token_required
def reservas_list(request):
    if request.method == 'GET':
        fecha = request.GET.get('fecha')
        estado = request.GET.get('estado')
        qs = Reserva.objects.select_related('mesa', 'empleado').all()
        if fecha:
            qs = qs.filter(fecha=fecha)
        if estado:
            qs = qs.filter(estado=estado)
        return JsonResponse([reserva_to_dict(r) for r in qs], safe=False)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        nombre = payload.get('nombre_cliente', '').strip()
        if not nombre:
            return JsonResponse({'error': 'El nombre del cliente es obligatorio'}, status=400)
        fecha = payload.get('fecha')
        hora = payload.get('hora')
        if not fecha or not hora:
            return JsonResponse({'error': 'Fecha y hora son requeridas'}, status=400)

        mesa = None
        if payload.get('mesa_id'):
            try:
                mesa = Mesa.objects.get(id=payload['mesa_id'], activa=True)
            except Mesa.DoesNotExist:
                return JsonResponse({'error': 'Mesa no encontrada'}, status=400)

        empleado = None
        if payload.get('empleado_id'):
            try:
                empleado = Empleado.objects.get(id=payload['empleado_id'], activo=True)
            except Empleado.DoesNotExist:
                return JsonResponse({'error': 'Empleado no encontrado'}, status=400)

        from datetime import datetime
        try:
            hora_obj = datetime.strptime(hora, '%H:%M').time()
        except ValueError:
            return JsonResponse({'error': 'Formato de hora inválido, use HH:MM'}, status=400)

        r = Reserva.objects.create(
            nombre_cliente=nombre,
            telefono=payload.get('telefono', ''),
            email=payload.get('email', ''),
            fecha=fecha,
            hora=hora_obj,
            personas=payload.get('personas', 1),
            mesa=mesa,
            estado=payload.get('estado', 'pendiente'),
            empleado=empleado,
            notas=payload.get('notas', ''),
        )
        return JsonResponse(reserva_to_dict(r), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
@token_required
def reserva_detail(request, reserva_id):
    try:
        r = Reserva.objects.select_related('mesa', 'empleado').get(id=reserva_id)
    except Reserva.DoesNotExist:
        return JsonResponse({'error': 'Reserva no encontrada'}, status=404)

    if request.method == 'GET':
        return JsonResponse(reserva_to_dict(r))

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return HttpResponseBadRequest('JSON inválido')

        if 'nombre_cliente' in payload:
            r.nombre_cliente = payload['nombre_cliente'].strip()
        if 'telefono' in payload:
            r.telefono = payload['telefono']
        if 'email' in payload:
            r.email = payload['email']
        if 'fecha' in payload:
            r.fecha = payload['fecha']
        if 'hora' in payload:
            from datetime import datetime
            r.hora = datetime.strptime(payload['hora'], '%H:%M').time()
        if 'personas' in payload:
            r.personas = payload['personas']
        if 'mesa_id' in payload:
            r.mesa = Mesa.objects.get(id=payload['mesa_id']) if payload['mesa_id'] else None
        if 'estado' in payload:
            if payload['estado'] not in dict(Reserva.ESTADOS):
                return JsonResponse({'error': f'Estado inválido: {payload["estado"]}'}, status=400)
            r.estado = payload['estado']
        if 'notas' in payload:
            r.notas = payload['notas']
        r.save()
        return JsonResponse(reserva_to_dict(r))

    if request.method == 'DELETE':
        r.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['GET', 'PATCH', 'DELETE'])


# ─── UPLOAD DE IMÁGENES ───────────────────────────────────────────────────────

@csrf_exempt
@token_required
def upload_imagen_view(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    if 'imagen' not in request.FILES:
        return JsonResponse({'error': 'No se envió ningún archivo'}, status=400)

    archivo = request.FILES['imagen']
    ext = archivo.name.split('.')[-1] if '.' in archivo.name else 'jpg'
    nombre = f'platos/{uuid.uuid4().hex}.{ext}'

    from django.core.files.storage import default_storage
    from django.conf import settings
    ruta = default_storage.save(nombre, archivo)
    url = f'{settings.MEDIA_URL}{ruta}'

    return JsonResponse({'url': url, 'nombre': ruta}, status=201)

