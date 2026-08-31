# Restaurante — Sistema de Gestión

## Stack
- Backend: Django 6.0 + MySQL
- Frontend: React 19 + React Router 7
- Panel admin con tema negro + naranja

## Estado del proyecto

### Backend (100% funcional)
- [x] Modelos: Restaurant (no, solo 1), AuthToken, Rol, Empleado, CategoriaProducto, Producto, CategoriaPlato, Plato, Receta
- [x] API REST: auth (login/register/logout/me), CRUD roles, empleados, productos, categorías, platos, recetas
- [x] Endpoint /api/ordenar/ consume stock
- [x] Auto-desactivar producto cuando stock <= 0 (en ordenar_view y producto_detail PATCH)
- [x] Auto-desactivar platos cuando un producto de su receta se desactiva (función desactivar_platos_por_producto)
- [x] Validación al reactivar plato: si hay productos inactivos, error "No hay productos disponibles"

### Frontend público
- [x] Navbar con scroll por secciones + auth
- [x] Login / Register
- [x] Inicio (hero estático)
- [ ] Menu.jsx — NO conectado a API (datos hardcodeados)
- [x] SobreMi (estático)

### Frontend admin
- [x] AdminLayout con sidebar
- [x] AdminHome (dashboard con datos mockeados)
- [x] AdminEmpleados.jsx — CRUD completo con filtros y paginación
- [x] AdminProductos.jsx — CRUD completo + exportar PDF + ajuste stock + ver usos en platos
- [x] AdminPlatos.jsx — CRUD con recetas, buscador, filtros tipo dropdown, alertas al ordenar, advertencias de stock bajo/productos inactivos
- [ ] AdminReservas — placeholder, sin implementar
- [x] Adminmenu.jsx — ELIMINADO (no se usaba)

### Bugs fixeados
- [x] TypeError en producto_detail PATCH (stock como string) — convertido a Decimal

## Pendientes
1. Conectar Menu.jsx público a la API real
2. Dashboard AdminHome con datos reales
3. Módulo de Reservas
4. Tests

## Deploy
- Frontend (React) → Vercel
- Backend (Django + MySQL) → Railway o Render
- Hacer deploy cuando el sistema esté completo, aunque sea para 1 solo restaurante

## Multi-tenant (futuro)
- Si más restaurantes quieren usar el sistema, agregar modelo Restaurant con subdominio
- Poner FK restaurant_id en todos los modelos
- Middleware por subdominio para filtrar automáticamente
- Usar shared DB con restaurant_id (no DB separadas por tenant)
- No implementar ahora, solo cuando haya demanda real

