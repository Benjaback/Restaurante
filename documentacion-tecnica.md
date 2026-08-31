# Documentación Técnica — Sistema de Gestión Restaurante

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Requisitos e instalación](#2-requisitos-e-instalación)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Base de datos — Modelos](#4-base-de-datos--modelos)
5. [API REST — Endpoints](#5-api-rest--endpoints)
6. [Frontend — React](#6-frontend--react)
7. [Autenticación](#7-autenticación)
8. [Flujos de negocio](#8-flujos-de-negocio)
9. [Seguridad](#9-seguridad)
10. [Deploy](#10-deploy)
11. [Deudas técnicas y mejoras pendientes](#11-deudas-técnicas-y-mejoras-pendientes)

---

## 1. Descripción general

Sistema full-stack para la gestión integral de un restaurante. Permite administrar empleados, productos, platos con recetas, mesas, pedidos, caja, reservas y producción.

- **Backend:** Django 6.0.3 + MySQL
- **Frontend:** React 19 + React Router 7 + TailwindCSS
- **Autenticación:** Token custom (no JWT, no sesión)

---

## 2. Requisitos e instalación

### Requisitos

- Python 3.10+
- Node.js 18+
- MySQL 8+
- pip y npm

### Backend

```bash
# Clonar repositorio
git clone <repo>
cd Restaurante

# Crear y activar entorno virtual
python -m venv env
source env/bin/activate  # Linux/Mac
# env\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar base de datos MySQL
# Crear base de datos llamada "restaurante"
mysql -u root -e "CREATE DATABASE restaurante CHARACTER SET utf8mb4;"

# Configurar credenciales en settings.py o variables de entorno
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
#         'NAME': 'restaurante',
#         'USER': 'tu_usuario',
#         'PASSWORD': 'tu_password',
#         'HOST': 'localhost',
#         'PORT': '3306',
#     }
# }

# Migrar base de datos
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm start
```

El frontend corre en `http://localhost:3000` y proxy hacia Django en `http://127.0.0.1:8000`.

---

## 3. Estructura del proyecto

```
Restaurante/
├── manage.py                  # Entry point Django
├── requirements.txt           # Python: Django 6.0.3, mysqlclient, django-cors-headers
├── .env                       # Variables de entorno (NO COMMITEAR)
│
├── pilate/                    # Configuración Django
│   ├── settings.py
│   ├── urls.py                # /admin/, /api/
│   ├── wsgi.py
│   └── asgi.py
│
├── api/                       # App Django principal
│   ├── models.py              # 19 modelos
│   ├── views.py               # ~2000 líneas — todas las vistas
│   ├── urls.py                # 39 endpoints
│   ├── admin.py               # Registro en admin de Django
│   └── migrations/            # 17 migraciones
│
├── frontend/                  # React 19 — SPA
│   ├── package.json           # proxy: http://127.0.0.1:8000
│   ├── tailwind.config.js
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js             # Router + AuthProvider
│       ├── contexts/
│       │   └── AuthContext.js
│       ├── components/
│       │   ├── navbar.jsx
│       │   └── ConfirmModal.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── inicio.jsx
│           ├── menu.jsx
│           ├── sobreMi.jsx
│           └── admin/
│               ├── AdminLayout.jsx
│               ├── AdminHome.jsx
│               ├── AdminEmpleados.jsx
│               ├── AdminProductos.jsx
│               ├── AdminPlatos.jsx
│               ├── AdminMesas.jsx
│               ├── AdminTurnos.jsx
│               ├── AdminElaboracion.jsx
│               ├── AdminPedidos.jsx
│               ├── AdminCaja.jsx
│               └── AdminReservas.jsx
│
└── env/                       # Virtualenv (no commitar)
```

---

## 4. Base de datos — Modelos

### Diagrama de relaciones

```
User (Django auth)
  │
  ├── AuthToken (1:N)
  │     key (unique), user → User, created
  │
  └── Empleado (1:1)
        nombre, apellido, dni, fecha_nacimiento, direccion
        telefono, email, activo, fecha_contratacion
        │
        ├── Rol (N:1)
        │     nombre (unique), descripcion, activo
        │     group → Group (1:1, se sincroniza automáticamente)
        │
        └── Turno (N:1)
              nombre (unique), hora_inicio, hora_fin, activo

Producto
  nombre, stock (Decimal), precio_compra (Decimal)
  unidad, stock_minimo, activo, fecha_creacion
  │
  ├── CategoriaProducto (N:1)
  │     nombre (unique), activo
  │
  ├── Receta (1:N) ← como insumo
  │     plato → Plato, cantidad
  │
  ├── RecetaProducto (1:N) ← como insumo
  │     producto_elaborado → Producto, cantidad
  │
  └── RecetaProducto (N:1) ← como elaborado
        producto_insumo → Producto, cantidad

Produccion
  producto → Producto, cantidad, fecha, descripcion
  │
  └── Producto (N:1)

Plato
  nombre, precio (Decimal), descripcion, imagen (URL)
  activo, fecha_creacion
  │
  ├── CategoriaPlato (N:1)
  │     nombre (unique), activo
  │
  └── Receta (1:N)
        producto → Producto, cantidad
        unique: (plato, producto)

Mesa
  numero, capacidad, activa
  │
  ├── AsignacionMesa (1:N)
  │     empleado → Empleado (rol=Mesero), turno → Turno, fecha
  │     unique: (mesa, turno, fecha)
  │
  └── Pedido (1:N)
        empleado → Empleado, mesa → Mesa
        estado: abierto/en_preparacion/servido/cerrado/pagado
        total, fecha_creacion, fecha_cierre
        │
        ├── DetallePedido (1:N)
        │     plato → Plato, cantidad, precio_unitario, subtotal
        │
        ├── Pago (1:1)
        │     monto, metodo: efectivo/tarjeta/transferencia
        │     vuelto, fecha
        │
        └── Ticket (1:1)
              total, fecha_emision

Caja
  empleado_apertura → Empleado
  empleado_cierre → Empleado (nullable)
  fecha_apertura, fecha_cierre (nullable)
  monto_inicial, monto_final (nullable)
  activa
  │
  └── MovimientoCaja (1:N)
        tipo: ingreso/egreso, monto
        referencia, descripcion, fecha

Reserva
  nombre_cliente, telefono, email
  fecha, hora, personas
  mesa → Mesa (nullable)
  estado: pendiente/confirmada/cancelada/cumplida
  empleado → Empleado (nullable)
  notas, fecha_creacion
```

### Convenciones

- `created` / `fecha_creacion` — auto_now_add para timestamp de creación
- `activo` / `activa` — soft delete booleano en todos los modelos principales
- `unique_together` usado en tablas intermedias (Receta, AsignacionMesa)
- `Decimal` para valores monetarios y cantidades (nunca Float)
- Relaciones con `CASCADE` en owner, `SET_NULL` en opcionales

---

## 5. API REST — Endpoints

### 5.1 Autenticación

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/auth/register/` | No | Registrar usuario |
| POST | `/api/auth/login/` | No | Login, devuelve token |
| POST | `/api/auth/logout/` | Sí | Eliminar token |
| GET | `/api/auth/me/` | Sí | Datos del usuario actual |

**POST /api/auth/login/**

Request:
```json
{
  "username": "jperez",
  "password": "miPassword123"
}
```

Response (200):
```json
{
  "token": "a1b2c3d4e5f6...64caracteres",
  "user": {
    "id": 1,
    "username": "jperez",
    "email": "jperez@mail.com",
    "is_staff": true,
    "is_superuser": false
  },
  "empleado": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": "Admin",
    "turno": "Mañana"
  }
}
```

### 5.2 Roles

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/roles/` | No | Listar roles activos |
| POST | `/api/roles/` | No | Crear rol |
| PATCH | `/api/roles/<id>/` | No | Actualizar rol |
| DELETE | `/api/roles/<id>/` | No | Eliminar rol |

### 5.3 Empleados

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/empleados/` | No | Listar (filtro `?rol=Mesero`) |
| POST | `/api/empleados/` | No | Crear (crea User + envía email) |
| PATCH | `/api/empleados/<id>/` | No | Actualizar |
| DELETE | `/api/empleados/<id>/` | No | Eliminar |

### 5.4 Productos

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/productos/` | No | Listar |
| POST | `/api/productos/` | No | Crear |
| PATCH | `/api/productos/<id>/` | No | Actualizar (auto-desactiva si stock ≤ 0) |
| DELETE | `/api/productos/<id>/` | No | Eliminar (solo si no tiene usos) |
| GET | `/api/productos/<id>/usos/` | No | Platos que usan este producto |

### 5.5 Platos

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/platos/` | No | Listar |
| POST | `/api/platos/` | No | Crear (con recetas) |
| PATCH | `/api/platos/<id>/` | No | Actualizar (valida productos activos al reactivar) |
| DELETE | `/api/platos/<id>/` | No | Eliminar |

**POST /api/platos/**

Request:
```json
{
  "nombre": "Milanesa con papas",
  "precio": 8500.00,
  "categoria_id": 1,
  "descripcion": "Milanesa de carne con papas fritas",
  "activo": true,
  "recetas": [
    { "producto_id": 1, "cantidad": 0.2 },
    { "producto_id": 2, "cantidad": 0.3 }
  ]
}
```

### 5.6 Pedidos (requieren auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/pedidos/` | Listar (`?estado=&mesa_id=`) |
| POST | `/api/pedidos/` | Crear (requiere caja activa) |
| GET | `/api/pedidos/<id>/` | Ver detalle |
| PATCH | `/api/pedidos/<id>/` | Actualizar estado |
| DELETE | `/api/pedidos/<id>/` | Eliminar |
| POST | `/api/pedidos/<id>/confirmar/` | Confirmar y consumir stock |

### 5.7 Pagos (requieren auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/pagos/` | Registrar pago (crea Ticket + MovimientoCaja) |

**POST /api/pagos/**

Request:
```json
{
  "pedido_id": 1,
  "monto": 8500.00,
  "metodo": "efectivo",
  "vuelto": 1500.00
}
```

### 5.8 Caja (requieren auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cajas/` | Listar cajas |
| POST | `/api/cajas/` | Abrir caja (cierra anteriores automáticamente) |
| PATCH | `/api/cajas/<id>/` | Cerrar caja (`{"cerrar": true, ...}`) |
| DELETE | `/api/cajas/<id>/` | Eliminar |
| GET | `/api/movimientos-caja/` | Listar (`?caja_id=`) |
| POST | `/api/movimientos-caja/` | Crear movimiento manual |

### 5.9 Reservas (requieren auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/reservas/` | Listar (`?fecha=&estado=`) |
| POST | `/api/reservas/` | Crear |
| GET | `/api/reservas/<id>/` | Ver detalle |
| PATCH | `/api/reservas/<id>/` | Actualizar |
| DELETE | `/api/reservas/<id>/` | Eliminar |

### 5.10 Otros endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET/POST | `/api/turnos/` | No | CRUD turnos |
| GET/POST | `/api/categorias-producto/` | No | CRUD categorías de producto |
| GET/POST | `/api/categorias-plato/` | No | CRUD categorías de plato |
| GET/POST | `/api/recetas-producto/` | No | CRUD recetas de elaboración |
| GET/POST | `/api/producciones/` | No | Registrar producción |
| GET/POST | `/api/mesas/` | No | CRUD mesas |
| GET/POST | `/api/asignaciones/` | No | CRUD asignaciones mesa-mesero |
| POST | `/api/ordenar/` | No | Orden directa (consume stock inmediato) |
| POST | `/api/upload-imagen/` | Sí | Subir imagen, devuelve URL |

---

## 6. Frontend — React

### 6.1 Rutas

| Ruta | Componente | Acceso |
|------|------------|--------|
| `/` | Inicio + Menu + SobreMi (scroll) | Público |
| `/login` | Login | Público |
| `/register` | Register | Público |
| `/admin/*` | AdminLayout (ver abajo) | Requiere auth + empleado/staff |

Rutas admin (dentro de AdminLayout):
- `/admin/home` — Dashboard
- `/admin/empleados` — CRUD empleados
- `/admin/productos` — CRUD productos
- `/admin/platos` — CRUD platos
- `/admin/mesas` — CRUD mesas + asignaciones
- `/admin/turnos` — CRUD turnos
- `/admin/elaboracion` — Recetas de producción
- `/admin/pedidos` — Gestión de pedidos
- `/admin/caja` — Caja registradora
- `/admin/reservas` — CRUD reservas

### 6.2 AuthContext

Provider global que expone:

```javascript
const { user, empleado, token, loading, login, logout, saveSession } = useAuth();
```

- `login(username, password)` → POST `/api/auth/login/` → guarda en localStorage
- `logout()` → POST `/api/auth/logout/` → limpia localStorage
- Al montar: verifica token con GET `/api/auth/me/`

### 6.3 Comunicación con API

No hay un servicio compartido. Cada página define su helper:

```javascript
// Sin token
const api = (url, opts) =>
  fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts })
    .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }));

// Con token
function api(url, opts = {}) {
  const token = localStorage.getItem('auth_token');
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
    ...opts,
  }).then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }));
}
```

---

## 7. Autenticación

### Modelo

- `AuthToken` con campo `key` (64 caracteres hex), FK a `User`, y `created`
- Cada login genera un nuevo token
- Cada logout elimina el token de la BD

### Decorador `@token_required`

```python
def token_required(view_func):
    def wrapper(request, *args, **kwargs):
        header = request.headers.get('Authorization', '')
        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != 'token':
            return JsonResponse({'error': 'Token requerido'}, status=401)
        token = AuthToken.objects.select_related('user').get(key=parts[1])
        request.user = token.user
        return view_func(request, *args, **kwargs)
    return wrapper
```

### Endpoints protegidos

Actualmente solo: logout, me, pedidos, pagos, tickets, caja, movimientos-caja, reservas, upload-imagen.

### Almacenamiento en frontend

- `localStorage.setItem('auth_token', token)`
- `localStorage.setItem('auth_data', JSON.stringify({ user, empleado }))`

---

## 8. Flujos de negocio

### 8.1 Pedido

```
1. POST /api/pedidos/
   → Crea Pedido + DetallePedido
   → Valida caja activa
   → Estado: abierto

2. POST /api/pedidos/<id>/confirmar/
   → Por cada detalle:
       Por cada receta del plato:
         producto.stock -= cantidad_receta * cantidad_detalle
         Si stock ≤ 0 → producto.activo = False
         → desactivar_platos_por_producto(producto)
   → Estado: en_preparacion

3. PATCH /api/pedidos/<id>/ (estado: servido)
   PATCH /api/pedidos/<id>/ (estado: cerrado)

4. POST /api/pagos/
   → Crea Pago + Ticket + MovimientoCaja
   → Estado: pagado
```

### 8.2 Auto-desactivación en cascada

```
Producto.stock ≤ 0
  → Producto.activo = False
  → desactivar_platos_por_producto(producto)
    → Busca todos los platos cuya receta incluye este producto
    → plato.activo = False (para cada uno)

Al reactivar plato:
  → Valida que todos los productos de su receta estén activos
  → Si hay inactivos → error 400
```

### 8.3 Caja

```
ABRIR: POST /api/cajas/
  → Cierra cajas activas anteriores automáticamente
  → Crea nueva caja con activa=True

MOVIMIENTOS:
  - Ingresos: automáticos al pagar un pedido
  - Egresos: POST manual a /api/movimientos-caja/

CERRAR: PATCH /api/cajas/<id>/ con { cerrar: true, ... }
  → activa = False, fecha_cierre = ahora
```

### 8.4 Producción

```
POST /api/producciones/
  Body: { producto_id, cantidad, descripcion }
  → Por cada RecetaProducto del producto:
      insumo.stock -= cantidad_receta * cantidad_producir
  → producto_elaborado.stock += cantidad_producir
```

---

## 9. Seguridad

### Estado actual

| Aspecto | Estado |
|---------|--------|
| Auth en endpoints críticos | ✅ Pedidos, pagos, caja, reservas |
| Auth en endpoints básicos | ❌ Productos, platos, empleados, roles, mesas |
| CSRF | ❌ `@csrf_exempt` en todas (SPA con token) |
| Token storage | localStorage (vulnerable a XSS) |
| CORS | `CORS_ALLOW_ALL_ORIGINS = True` |
| Secret Key | Hardcodeada en settings.py |
| ALLOWED_HOSTS | Vacío |
| DEBUG | True |
| Contraseñas | Hasheadas con PBKDF2 ✅ |
| HTTPS | No configurado |
| Rate limiting | No implementado |

### Recomendado antes de producción

1. Poner `@token_required` en todos los endpoints de escritura
2. Migrar SECRET_KEY a variable de entorno
3. `DEBUG = False`
4. `ALLOWED_HOSTS = ['dominio.com']`
5. `CORS_ALLOW_ALL_ORIGINS = False` + `CORS_ALLOWED_ORIGINS`
6. Agregar expiración de tokens
7. Rotar credenciales de Gmail (están en git)

---

## 10. Deploy

### Backend (Railway / Render)

```bash
# Build command
pip install -r requirements.txt

# Start command
gunicorn pilate.wsgi

# Variables de entorno requeridas
SECRET_KEY=<generada>
DB_NAME=restaurante
DB_USER=<usuario>
DB_PASSWORD=<password>
DB_HOST=<host>
DB_PORT=3306
EMAIL_HOST_USER=<email>
EMAIL_HOST_PASSWORD=<password>
DEBUG=False
ALLOWED_HOSTS=.railway.app,.tu-domino.com
```

### Frontend (Vercel)

- Framework: Create React App
- Build: `npm run build`
- Output: `build/`
- Variables: `REACT_APP_API_URL=https://api.tudominio.com`

---

## 11. Deudas técnicas y mejoras pendientes

### Alta prioridad

- [ ] Proteger endpoints CRUD con `@token_required`
- [ ] Mover secretos a variables de entorno
- [ ] Agregar permisos por rol con Django Model Permissions
- [ ] Agregar `transaction.atomic` + `select_for_update` en confirmar pedido

### Media prioridad

- [ ] Separar `views.py` en módulos
- [ ] Crear helper `api()` compartido en frontend
- [ ] Agregar validación con esquemas o migrar a DRF
- [ ] Unificar estilos CSS

### Baja prioridad

- [ ] Conectar AdminHome a API real
- [ ] Agregar tests (pytest + RTL)
- [ ] Paginación server-side
- [ ] Migrar CRA a Vite
- [ ] Expiración de tokens
- [ ] Logging con Sentry
- [ ] Histórico de movimientos de stock
