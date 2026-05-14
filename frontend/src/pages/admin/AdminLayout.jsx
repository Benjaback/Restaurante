import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminHome from './AdminHome';
import AdminEmpleados from './AdminEmpleados';
import AdminProductos from './AdminProductos';
import AdminPlatos from './AdminPlatos';
import './admin-layout.css';

const AdminPlaceholder = ({ title, description }) => (
  <div className="admin-home dashboard-panel">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">Sección pendiente</p>
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
    </header>
  </div>
);

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, empleado, logout } = useAuth();
  const navigate = useNavigate();

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
            <h2>La Mesa Grande</h2>
            <p>Panel administrativo</p>
          </div>
        </div>

        <nav className="admin-nav">
          <ul>
            <li>
              <NavLink
                to="/admin/home"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Resumen
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/reservas"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Reservas
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/platos"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Menú
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/empleados"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Empleados
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/productos"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Productos
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="admin-footer">
          <div className="admin-user-info">
            <span className="admin-user-name">{empleado ? empleado.nombre : user?.username}</span>
            {empleado && <span className="admin-user-role">{empleado.rol} · {empleado.turno}</span>}
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
          <Route path="home" element={<AdminHome />} />
          <Route
            path="reservas"
            element={
              <AdminPlaceholder
                title="Reservas"
                description="Gestiona reservas y horarios desde aquí."
              />
            }
          />
          <Route path="empleados" element={<AdminEmpleados />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="platos" element={<AdminPlatos />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;