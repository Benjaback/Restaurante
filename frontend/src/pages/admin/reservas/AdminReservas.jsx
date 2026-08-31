import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const ESTADOS = ['pendiente', 'confirmada', 'cancelada', 'cumplida'];

const ESTADOS_LABEL = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  cumplida: 'Cumplida',
};

const ESTADOS_CLASS = {
  pendiente: 'ap-badge--warn',
  confirmada: 'ap-badge--info',
  cancelada: 'ap-badge--no',
  cumplida: 'ap-badge--ok',
};

const FORM_VACIO = {
  nombre_cliente: '', telefono: '', fecha: '', hora: '',
  personas: 1, mesa_id: '', notas: '',
};

export default function AdminReservas() {
  const { empleado } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const hoy = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  const loadReservas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroFecha) params.set('fecha', filtroFecha);
      const q = params.toString();
      const data = await api(`/api/reservas/${q ? '?' + q : ''}`);
      setReservas(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroEstado, filtroFecha]);

  const loadMesas = async () => {
    try {
      const m = await api('/api/mesas/');
      setMesas(m.filter(mm => mm.activa));
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { loadReservas(); loadMesas(); }, [loadReservas]);

  const openModal = (r) => {
    if (r) {
      setEditando(r);
      setForm({
        nombre_cliente: r.nombre_cliente,
        telefono: r.telefono || '',
        fecha: r.fecha,
        hora: r.hora,
        personas: r.personas,
        mesa_id: r.mesa_id || '',
        notas: r.notas || '',
      });
    } else {
      setEditando(null);
      setForm({ ...FORM_VACIO, fecha: hoy, hora: '20:00' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = {
        ...form,
        mesa_id: form.mesa_id ? parseInt(form.mesa_id) : null,
        empleado_id: empleado?.id,
      };
      if (editando) {
        await api(`/api/reservas/${editando.id}/`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await api('/api/reservas/', { method: 'POST', body: JSON.stringify(body) });
      }
      setModalOpen(false);
      loadReservas();
    } catch (e) { setError(e.message); }
  };

  const cambiarEstado = async (r, estado) => {
    try {
      await api(`/api/reservas/${r.id}/`, { method: 'PATCH', body: JSON.stringify({ estado }) });
      loadReservas();
    } catch (e) { setError(e.message); }
  };

  const eliminar = async (r) => {
    try {
      await api(`/api/reservas/${r.id}/`, { method: 'DELETE' });
      loadReservas();
    } catch (e) { setError(e.message); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div>
          <p className="ap-eyebrow">Reservas</p>
          <h1 className="ap-title">Gestión de reservas</h1>
          <p className="ap-subtitle">Registrá y gestioná las reservas de tus clientes.</p>
        </div>
        <button className="ap-btn ap-btn--primary" onClick={() => openModal(null)}>Nueva reserva</button>
      </header>

      {error && <div className="ap-error-bar">{error}</div>}

      <div className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-search-wrap">
            <input
              className="ap-input"
              type="date"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
            />
          </div>
          <div className="ap-filter-group">
            <button
              className={`ap-btn ap-btn--sm ${!filtroEstado ? 'ap-btn--primary' : 'ap-btn--ghost'}`}
              onClick={() => setFiltroEstado('')}
            >
              Todas
            </button>
            {ESTADOS.map(e => (
              <button
                key={e}
                className={`ap-btn ap-btn--sm ${filtroEstado === e ? 'ap-btn--primary' : 'ap-btn--ghost'}`}
                onClick={() => setFiltroEstado(e)}
              >
                {ESTADOS_LABEL[e]}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="ap-loading">Cargando…</div> : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Hora</th>
                  <th>Personas</th>
                  <th>Mesa</th>
                  <th>Estado</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.length === 0 ? (
                  <tr><td colSpan={8} className="ap-empty">No hay reservas para esta fecha.</td></tr>
                ) : (
                  reservas.map(r => (
                    <tr key={r.id}>
                      <td className="ap-td--bold">{r.nombre_cliente}</td>
                      <td>{r.telefono || '—'}</td>
                      <td>{r.hora}</td>
                      <td>{r.personas}</td>
                      <td>{r.mesa_numero ? `Mesa ${r.mesa_numero}` : '—'}</td>
                      <td>
                        <select
                          className={`ap-badge ${ESTADOS_CLASS[r.estado]}`}
                          style={{ border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: '2px 8px' }}
                          value={r.estado}
                          onChange={e => cambiarEstado(r, e.target.value)}
                        >
                          {ESTADOS.map(e => (
                            <option key={e} value={e}>{ESTADOS_LABEL[e]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="ap-text--muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.notas || '—'}
                      </td>
                      <td>
                        <div className="ap-actions">
                          <button className="ap-btn ap-btn--ghost" onClick={() => openModal(r)}>Editar</button>
                          <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => eliminar(r)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva/Editar Reserva */}
      {modalOpen && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setModalOpen(false); setForm(FORM_VACIO); }}}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>{editando ? 'Editar reserva' : 'Nueva reserva'}</h3>
              <button className="ap-modal-close" onClick={() => { setModalOpen(false); setForm(FORM_VACIO); }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="ap-form">
              <div className="ap-form-grid">
                <div className="ap-field">
                  <label>Cliente *</label>
                  <input className="ap-input" name="nombre_cliente" value={form.nombre_cliente} onChange={handleChange} required />
                </div>
                <div className="ap-field">
                  <label>Teléfono</label>
                  <input className="ap-input" name="telefono" value={form.telefono} onChange={handleChange} />
                </div>
                <div className="ap-field">
                  <label>Fecha *</label>
                  <input className="ap-input" name="fecha" type="date" value={form.fecha} onChange={handleChange} required />
                </div>
                <div className="ap-field">
                  <label>Hora *</label>
                  <input className="ap-input" name="hora" type="time" value={form.hora} onChange={handleChange} required />
                </div>
                <div className="ap-field">
                  <label>Personas</label>
                  <input className="ap-input" name="personas" type="number" min="1" value={form.personas} onChange={handleChange} />
                </div>
                <div className="ap-field">
                  <label>Mesa</label>
                  <select className="ap-input" name="mesa_id" value={form.mesa_id} onChange={handleChange}>
                    <option value="">Sin asignar</option>
                    {mesas.map(m => (
                      <option key={m.id} value={m.id}>Mesa {m.numero} (cap. {m.capacidad})</option>
                    ))}
                  </select>
                </div>
                <div className="ap-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Notas</label>
                  <textarea className="ap-input" name="notas" value={form.notas} onChange={handleChange} rows={3} />
                </div>
              </div>
              <div className="ap-modal-footer">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => { setModalOpen(false); setForm(FORM_VACIO); }}>Cancelar</button>
                <button type="submit" className="ap-btn ap-btn--primary">{editando ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
