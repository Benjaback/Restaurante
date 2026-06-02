# Sistema de Gestión para Restaurantes

Sistema full-stack para la administración de restaurantes: gestión de empleados, inventario de productos, platos con recetas, control de stock y panel administrativo.

## Instalación y Ejecución

### 1. Backend (Django)

```bash
# Crear y activar entorno virtual
python -m venv env
source env/bin/activate  # Linux/Mac
# o env\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt


# Migrar base de datos
python manage.py migrate

# Crear superusuario (opcional, para acceder al admin de Django)
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start
```

---

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


## 🛠️ Comandos Útiles

```bash
# Migraciones
python manage.py makemigrations
python manage.py migrate

# Admin de Django
python manage.py runserver

# Verificar proyecto
python manage.py check

# Shell de Django
python manage.py shell
```
