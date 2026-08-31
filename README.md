# Sistema de Gestión para Restaurantes

Sistema full-stack para la administración de restaurantes: gestión de empleados, inventario de productos, platos con recetas, control de stock y panel administrativo.

## Instalación y Ejecución

### Requisitos del sistema

- **Python 3.10 o superior** (Django 6.0 lo requiere)
- **Node.js 16+** (para el frontend)
- **MySQL 8+**


### 1. Base de datos MySQL

```sql
CREATE DATABASE restaurante CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configurar variables de entorno

Copiá la plantilla y completá los valores:

```bash
cp .env.example .env
# Editá .env con tu SECRET_KEY y credenciales de MySQL
```

### 3. Backend (Django)

```bash
# Crear y activar entorno virtual
python -m venv env
source env/bin/activate  # Linux
env\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Migrar base de datos
python manage.py migrate

# Crear superusuario (opcional, para acceder al admin de Django)
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

### 4. Frontend (React)

```bash
cd frontend
npm install
npm start
```

El frontend usa un proxy a `http://127.0.0.1:8000` (definido en `frontend/package.json`), así que el backend debe correr en ese puerto mientras desarrollo.

---

## 🗄️ Base de Datos

Las credenciales de MySQL ya **no** se editan en `pilate/settings.py`. Se configuran en el archivo `.env` (ver `.env.example`):

| Variable | Descripción |
|----------|-------------|
| `SECRET_KEY` | Clave secreta de Django (usar una generada, no la de ejemplo) |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de MySQL |
| `DB_PASSWORD` | Contraseña del usuario MySQL |
| `DB_HOST` | Host de MySQL (default `localhost`) |
| `DB_PORT` | Puerto de MySQL (default `3306`) |

## 📋 Modelos de Datos

### 🔐 AuthToken
Token de autenticación personalizado. Cada login genera un token nuevo; cada logout lo elimina.


### 👤 Empleado
Empleados del restaurante vinculados a un User de Django.


### Panel Administrativo

El sidebar incluye:
- **Resumen** — Dashboard con tarjetas informativas
- **Menú** — Gestión de platos y recetas
- **Empleados** — CRUD completo con filtros y paginación
- **Productos** — CRUD con alertas de stock bajo

---


## 📦 Flujo de Inventario

```
Crear CategoriaProducto → Crear Producto (con stock inicial)
                                    ↓
                  Crear CategoriaPlato → Crear Plato
                                            ↓
                        Agregar Receta (producto + cantidad)
                                            ↓
                              ORDENAR → valida stock → descuenta stock

Ejemplo:
1. Producto: `Fideos — stock: 1kg`
2. Producto: `Milanesa — stock: 4 unidades`
3. Plato: `Fideo con milanesa — $1200`
4. Receta: `400g de Fideos` + `2 Milanesas`
5. Ordenar: descuenta `400g` de Fideos y `2` de Milanesa

---

## 🛠️ Comandos Útiles

```bash
# Migraciones
python manage.py makemigrations
python manage.py migrate

# Admin de Django
python manage.py createsuperuser
# http://localhost:8000/admin/

# Verificar proyecto
python manage.py check

# Shell de Django
python manage.py shell
```
