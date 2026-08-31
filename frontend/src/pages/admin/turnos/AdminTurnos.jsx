import React, { useEffect, useState } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import api from '../../../services/api';

const AdminTurnos = () => {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', hora_inicio: '', hora_fin: '', activo: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    try { setTurnos(await api('/api/turnos/')); } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nombre: '', hora_inicio: '', hora_fin: '', activo: true }); setModalOpen(true); };

  const openEdit = (t) => { setEditing(t); setForm({ nombre: t.nombre, hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, activo: t.activo }); setModalOpen(true); };

  const closeModal = () => { setModalOpen(false); setEditing(null); setForm({ nombre: '', hora_inicio: '', hora_fin: '', activo: true }); setError(''); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const url = editing ? `/api/turnos/${editing.id}/` : '/api/turnos/';
      const method = editing ? 'PATCH' : 'POST';
      await api(url, { method, body: JSON.stringify(form) });
      closeModal();
      load();
      setSuccess(editing ? 'Turno actualizado' : 'Turno creado');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (t) => {
    try {
      await api(`/api/turnos/${t.id}/`, { method: 'DELETE' });
      setConfirmDelete(null);
      load();
      setSuccess('Turno eliminado');
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="at-root"><p className="at-loading">Cargando turnos…</p></div>;

  return (
    <div className="at-root">
      <header className="at-header">
        <div>
          <p className="at-eyebrow">Configuración del restaurante</p>
          <h1 className="at-title">Gestión de turnos</h1>
          <p className="at-subtitle">Define los horarios de los turnos del personal.</p>
        </div>
        <button className="at-btn at-btn--primary" onClick={openNew}>Nuevo turno</button>
      </header>

      {success && <div className="at-success">{success}</div>}

      <div className="at-table-wrap">
        <table className="at-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {turnos.length === 0 ? (
              <tr><td colSpan={5} className="at-empty">No hay turnos registrados.</td></tr>
            ) : turnos.map(t => (
              <tr key={t.id}>
                <td className="at-td--bold">{t.nombre}</td>
                <td>{t.hora_inicio}</td>
                <td>{t.hora_fin}</td>
                <td>{t.activo ? 'Sí' : 'No'}</td>
                <td className="at-acciones">
                  <button className="at-btn at-btn--ghost at-btn--sm" onClick={() => openEdit(t)}>Editar</button>
                  <button className="at-btn at-btn--danger-ghost at-btn--sm" onClick={() => setConfirmDelete(t)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="at-overlay" onClick={closeModal}>
          <div className="at-modal" onClick={e => e.stopPropagation()}>
            <div className="at-modal-header">
              <h2>{editing ? 'Editar turno' : 'Nuevo turno'}</h2>
              <button className="at-modal-close" onClick={closeModal}>&times;</button>
            </div>
            {error && <div className="at-error">{error}</div>}
            <form onSubmit={handleSubmit} className="at-form">
              <div className="at-form-grid">
                <div className="at-form-field">
                  <label className="at-label">Nombre</label>
                  <input className="at-input" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Mañana" required />
                </div>
                <div className="at-form-field">
                  <label className="at-label">Hora inicio</label>
                  <input className="at-input" name="hora_inicio" type="time" value={form.hora_inicio} onChange={handleChange} required />
                </div>
                <div className="at-form-field">
                  <label className="at-label">Hora fin</label>
                  <input className="at-input" name="hora_fin" type="time" value={form.hora_fin} onChange={handleChange} required />
                </div>
                <div className="at-form-field at-form-field--checkbox">
                  <label>
                    <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
                    {' '}Turno activo
                  </label>
                </div>
              </div>
              <div className="at-form-actions">
                <button type="submit" className="at-btn at-btn--primary">{editing ? 'Guardar' : 'Crear'}</button>
                <button type="button" className="at-btn at-btn--ghost" onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar el turno "${confirmDelete.nombre}"? Si hay empleados asignados quedarán sin turno.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default AdminTurnos;
