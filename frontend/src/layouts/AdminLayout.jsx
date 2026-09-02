import React, { useState, useMemo } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminHome from '../pages/admin/home/AdminHome';
import AdminEmpleados from '../pages/admin/empleados/AdminEmpleados';
import AdminMesas from '../pages/admin/mesas/AdminMesas';
import AdminProductos from '../pages/admin/productos/AdminProductos';
import AdminPlatos from '../pages/admin/platos/AdminPlatos';
import AdminElaboracion from '../pages/admin/elaboracion/AdminElaboracion';
import AdminTurnos from '../pages/admin/turnos/AdminTurnos';
import AdminPedidos from '../pages/admin/pedidos/AdminPedidos';
import AdminCaja from '../pages/admin/caja/AdminCaja';
import AdminReservas from '../pages/admin/reservas/AdminReservas';

const ALL_SECTIONS = [
  { path: '/admin/home',        label: 'Resumen',     roles: ['Gerente', 'Cajero', 'Mesero', 'Cocinero'] },
  { path: '/admin/pedidos',     label: 'Pedidos',     roles: ['Gerente', 'Cajero', 'Mesero'] },
  { path: '/admin/reservas',    label: 'Reservas',    roles: ['Gerente', 'Cajero'] },
  { path: '/admin/caja',        label: 'Caja',        roles: ['Gerente', 'Cajero'] },
  { path: '/admin/mesas',       label: 'Mesas',       roles: ['Gerente', 'Mesero'] },
  { path: '/admin/platos',      label: 'Menú',        roles: ['Gerente', 'Cocinero'] },
  { path: '/admin/productos',   label: 'Productos',   roles: ['Gerente'] },
  { path: '/admin/empleados',   label: 'Empleados',   roles: ['Gerente'] },
  { path: '/admin/elaboracion', label: 'Elaboración', roles: ['Gerente', 'Cocinero'] },
  { path: '/admin/turnos',      label: 'Turnos',      roles: ['Gerente'] },
];

const PAGES = {
  home: AdminHome, pedidos: AdminPedidos, reservas: AdminReservas,
  platos: AdminPlatos, caja: AdminCaja, empleados: AdminEmpleados,
  mesas: AdminMesas, productos: AdminProductos,
  elaboracion: AdminElaboracion, turnos: AdminTurnos,
};

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, empleado, logout } = useAuth();
  const navigate = useNavigate();

  const sections = useMemo(() => {
    if (user?.is_superuser) return ALL_SECTIONS;
    const rol = empleado?.rol;
    if (!rol) return [];
    return ALL_SECTIONS.filter(s => s.roles.includes(rol));
  }, [user, empleado]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="admin-layout">

      <button
        className="menu-toggle-admin"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-logo">
          <div className="admin-logo-icon">🍴</div>
          <div>
            <h2>La Casa Grande</h2>
            <p>Panel administrativo</p>
          </div>
        </div>

        <nav className="admin-nav">
          <ul>
            {sections.map(s => (
              <li key={s.path}>
                <NavLink
                  to={s.path}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setMenuOpen(false)}
                >
                  {s.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-footer">
          <div className="admin-user-info">
            <span className="admin-user-name">{empleado ? empleado.nombre : user?.username}</span>
            {empleado && <span className="admin-user-role">{empleado.rol} · {empleado.turno || 'Sin turno'}</span>}
            {!empleado && user?.is_superuser && <span className="admin-user-role">Superusuario</span>}
          </div>
          <NavLink to="/" onClick={() => setMenuOpen(false)} className="return-button">
            ← Volver al sitio
          </NavLink>
          <button onClick={handleLogout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <main className="admin-content">
        <Routes>
          <Route path="/" element={<Navigate to="/admin/home" />} />
          {sections.map(s => {
            const pageName = s.path.replace('/admin/', '');
            const Component = PAGES[pageName];
            return Component ? <Route key={s.path} path={pageName} element={<Component />} /> : null;
          })}
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;
