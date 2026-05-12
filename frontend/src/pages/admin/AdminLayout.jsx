import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import AdminHome from './AdminHome';
import AdminClases from './Adminmenu';
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
                📊 Resumen
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/reservas"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                📅 Reservas
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/clases"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                🍽️ Menú
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/empleados"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                👥 Empleados
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="admin-footer">
          <NavLink to="/" onClick={() => setMenuOpen(false)} className="return-button">
            ← Volver al sitio
          </NavLink>
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
          <Route path="clases" element={<AdminClases />} />
          <Route
            path="empleados"
            element={
              <AdminPlaceholder
                title="Empleados"
                description="Supervisa al equipo y turnos del restaurante."
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;