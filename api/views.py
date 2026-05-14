import json
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, User
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseNotAllowed
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from .models import AuthToken, CategoriaPlato, CategoriaProducto, Empleado, Plato, Producto, Receta, Rol


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
        if not hasattr(user, 'empleado') or not user.empleado.activo:
            return JsonResponse({'error': 'No tienes un perfil de empleado activo'}, status=403)

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
            'turno': user.empleado.turno,
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
    nombre = payload.get('nombre', '').strip()
    rol_id = payload.get('rol_id')

    if not username or not password:
        return JsonResponse({'error': 'Usuario y contraseña son requeridos'}, status=400)
    if not nombre:
        return JsonResponse({'error': 'El nombre del empleado es requerido'}, status=400)
    if not rol_id:
        return JsonResponse({'error': 'El rol es requerido'}, status=400)
    if len(password) < 6:
        return JsonResponse({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'El nombre de usuario ya existe'}, status=400)

    try:
        rol = Rol.objects.get(id=rol_id, activo=True)
    except Rol.DoesNotExist:
        return JsonResponse({'error': 'Rol no encontrado o inactivo'}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    if rol.group:
        user.groups.add(rol.group)

    empleado = Empleado.objects.create(
        nombre=nombre,
        rol=rol,
        turno=payload.get('turno', 'manana'),
        telefono=payload.get('telefono', '').strip(),
        email=email,
        user=user,
        activo=True,
    )

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
        'empleado': {
            'id': empleado.id,
            'nombre': empleado.nombre,
            'rol': empleado.rol.nombre,
            'turno': empleado.turno,
        }
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
            'turno': empleado.turno,
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


# ─── CATEGORÍAS DE PRODUCTO ──────────────────────────────────────────────────

@csrf_exempt
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


# ─── PRODUCTOS ───────────────────────────────────────────────────────────────

def producto_to_dict(p):
    return {
        'id': p.id,
        'nombre': p.nombre,
        'categoria': {'id': p.categoria.id, 'nombre': p.categoria.nombre} if p.categoria else None,
        'stock': float(p.stock),
        'unidad': p.unidad,
        'stock_minimo': float(p.stock_minimo),
        'activo': p.activo,
        'fecha_creacion': p.fecha_creacion.isoformat(),
    }


@csrf_exempt
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
            unidad=payload.get('unidad', 'unidad'),
            stock_minimo=payload.get('stock_minimo', 0),
            activo=payload.get('activo', True),
        )
        return JsonResponse(producto_to_dict(p), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
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
            p.stock = payload['stock']
        if 'unidad' in payload:
            p.unidad = payload['unidad']
        if 'stock_minimo' in payload:
            p.stock_minimo = payload['stock_minimo']
        if 'activo' in payload:
            p.activo = payload['activo']
        p.save()
        return JsonResponse(producto_to_dict(p))

    if request.method == 'DELETE':
        p.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ─── CATEGORÍAS DE PLATO ─────────────────────────────────────────────────────

@csrf_exempt
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


# ─── PLATOS ───────────────────────────────────────────────────────────────────

def receta_to_dict(r):
    return {
        'id': r.id,
        'producto_id': r.producto_id,
        'producto_nombre': r.producto.nombre,
        'producto_unidad': r.producto.unidad,
        'cantidad': float(r.cantidad),
    }


def plato_to_dict(p):
    return {
        'id': p.id,
        'nombre': p.nombre,
        'precio': float(p.precio),
        'categoria': {'id': p.categoria.id, 'nombre': p.categoria.nombre} if p.categoria else None,
        'descripcion': p.descripcion,
        'activo': p.activo,
        'fecha_creacion': p.fecha_creacion.isoformat(),
        'recetas': [receta_to_dict(r) for r in p.recetas.select_related('producto').all()],
    }


@csrf_exempt
def platos_list(request):
    if request.method == 'GET':
        platos = Plato.objects.prefetch_related('recetas__producto').all()
        return JsonResponse([plato_to_dict(p) for p in platos], safe=False)

    if request.method == 'POST':
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
            activo=payload.get('activo', True),
        )

        for item in payload.get('recetas', []):
            try:
                producto = Producto.objects.get(id=item['producto_id'])
            except Producto.DoesNotExist:
                continue
            Receta.objects.create(
                plato=plato,
                producto=producto,
                cantidad=item.get('cantidad', 0),
            )

        return JsonResponse(plato_to_dict(plato), status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def plato_detail(request, plato_id):
    try:
        plato = Plato.objects.prefetch_related('recetas__producto').get(id=plato_id)
    except Plato.DoesNotExist:
        return JsonResponse({'error': 'Plato no encontrado'}, status=404)

    if request.method == 'PATCH':
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
        if 'activo' in payload:
            plato.activo = payload['activo']
        if 'recetas' in payload:
            plato.recetas.all().delete()
            for item in payload['recetas']:
                try:
                    producto = Producto.objects.get(id=item['producto_id'])
                except Producto.DoesNotExist:
                    continue
                Receta.objects.create(
                    plato=plato,
                    producto=producto,
                    cantidad=item.get('cantidad', 0),
                )
        plato.save()
        return JsonResponse(plato_to_dict(plato))

    if request.method == 'DELETE':
        plato.delete()
        return JsonResponse({'deleted': True})

    return HttpResponseNotAllowed(['PATCH', 'DELETE'])


# ─── ORDENAR (consumir stock) ────────────────────────────────────────────────

@csrf_exempt
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
        necesario = float(r.cantidad) * cantidad
        if r.producto.stock < necesario:
            errores.append(f'Stock insuficiente de {r.producto.nombre}: disponible {r.producto.stock} {r.producto.unidad}, necesario {necesario} {r.producto.unidad}')

    if errores:
        return JsonResponse({'error': 'Stock insuficiente', 'detalles': errores}, status=400)

    for r in recetas:
        necesario = float(r.cantidad) * cantidad
        r.producto.stock -= necesario
        r.producto.save(update_fields=['stock'])

    return JsonResponse({
        'mensaje': f'{cantidad}x {plato.nombre} ordenado(s) correctamente',
        'plato': plato.nombre,
        'cantidad': cantidad,
    })
