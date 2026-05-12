import React from 'react';
import './admin-layout.css';

const AdminHome = () => {
  return (
    <div className="admin-home dashboard-panel">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Panel de control</p>
          <h1>Bienvenido al panel de administración</h1>
          <p className="subtitle">
            Aquí puedes ver el estado del restaurante y gestionar reservas, menú y personal.
          </p>
        </div>

        <div className="dashboard-actions">
          <button className="primary-button">Nuevo pedido</button>
          <button className="secondary-button">Exportar informe</button>
        </div>
      </header>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Reservas hoy</h3>
          <p className="card-value">42</p>
          <span>54% de ocupación</span>
        </article>

        <article className="dashboard-card">
          <h3>Ventas</h3>
          <p className="card-value">$1,240</p>
          <span>+12% respecto a ayer</span>
        </article>

        <article className="dashboard-card">
          <h3>Platos destacados</h3>
          <p className="card-value">8</p>
          <span>Actualiza el menú cuando quieras</span>
        </article>

        <article className="dashboard-card">
          <h3>Equipo activo</h3>
          <p className="card-value">7</p>
          <span>Turnos confirmados</span>
        </article>
      </section>
    </div>
  );
};

export default AdminHome;
