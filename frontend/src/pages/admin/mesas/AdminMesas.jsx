import React, { useEffect, useState, useCallback } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import api from '../../../services/api';

const TODAY = new Date().toISOString().slice(0, 10);

export default function AdminMesas() {
  const [mesas, setMesas] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [meseros, setMeseros] = useState([]);
  const [fecha, setFecha] = useState(TODAY);
  const [turnoId, setTurnoId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMesa, setModalMesa] = useState(null);
  const [selectedEmpleado, setSelectedEmpleado] = useState('');
  const [loading, setLoading] = useState(true);

  // CRUD mesa
  const [crudModal, setCrudModal] = useState(false);
  const [editMesa, setEditMesa] = useState(null);
  const [formMesa, setFormMesa] = useState({ numero: '', capacidad: 4 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toggleConfirm, setToggleConfirm] = useState(null);
  const [mesaError, setMesaError] = useState('');

  useEffect(() => {
    (async () => {
      const turnosData = await api('/api/turnos/');
      setTurnos(turnosData);
      if (turnosData.length > 0) setTurnoId(String(turnosData[0].id));
    })();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mesasData, meserosData] = await Promise.all([
        api('/api/mesas/'),
        api('/api/empleados/?rol=Mesero'),
      ]);
      setMesas(mesasData);
      setMeseros(meserosData);

      const params = new URLSearchParams({ fecha });
      params.set('turno_id', turnoId);
      setAsignaciones(await api(`/api/asignaciones/?${params}`));
    } catch {}
    setLoading(false);
  }, [fecha, turnoId]);

  useEffect(() => { if (turnoId) loadData(); }, [loadData, turnoId]);

  const asignacionPorMesa = (mesaId) =>
    asignaciones.find(a => a.mesa_id === mesaId);

  const handleClickMesa = (mesa) => {
    const asig = asignacionPorMesa(mesa.id);
    setModalMesa(mesa);
    setSelectedEmpleado(asig ? String(asig.empleado_id) : '');
    setModalOpen(true);
  };

  const handleAsignar = async () => {
    if (!selectedEmpleado) return;
    const asig = asignacionPorMesa(modalMesa.id);
    try {
      if (asig) {
        await api(`/api/asignaciones/${asig.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ empleado_id: parseInt(selectedEmpleado) }),
        });
      } else {
        await api('/api/asignaciones/', {
          method: 'POST',
          body: JSON.stringify({
            mesa_id: modalMesa.id,
            empleado_id: parseInt(selectedEmpleado),
            turno_id: parseInt(turnoId),
            fecha,
          }),
        });
      }
      setModalOpen(false);
      loadData();
    } catch {}
  };

  const handleDesasignar = async () => {
    const asig = asignacionPorMesa(modalMesa.id);
    if (!asig) return;
    try {
      await api(`/api/asignaciones/${asig.id}/`, { method: 'DELETE' });
      setModalOpen(false);
      loadData();
    } catch {}
  };

  const handleToggleActiva = async (mesa) => {
    try {
      await api(`/api/mesas/${mesa.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ activa: !mesa.activa }),
      });
      setToggleConfirm(null);
      setModalOpen(false);
      loadData();
    } catch {}
  };

  // ── CRUD Mesas ──────────────────────────────────────────────────────────
  const openCrud = (mesa = null) => {
    setEditMesa(mesa);
    setFormMesa(mesa ? { numero: mesa.numero, capacidad: mesa.capacidad, activa: mesa.activa } : { numero: '', capacidad: 4, activa: true });
    setMesaError('');
    setCrudModal(true);
  };

  const handleSaveMesa = async (e) => {
    e.preventDefault();
    setMesaError('');
    const url = editMesa ? `/api/mesas/${editMesa.id}/` : '/api/mesas/';
    const method = editMesa ? 'PATCH' : 'POST';
    try {
      await api(url, { method, body: JSON.stringify(formMesa) });
      setCrudModal(false);
      loadData();
    } catch (e) {
      setMesaError(e.message);
    }
  };

  const handleDeleteMesa = async (id) => {
    try {
      await api(`/api/mesas/${id}/`, { method: 'DELETE' });
      setDeleteConfirm(null);
      loadData();
    } catch {}
  };

  if (loading) return <div className="am-loading">Cargando mesas…</div>;

  const mesasActivas = mesas.filter(m => m.activa);
  const mesasInactivas = mesas.filter(m => !m.activa);

  return (
    <div className="am-root">
      {/* HEADER */}
      <div className="am-header">
        <div>
          <p className="am-eyebrow">Restaurante</p>
          <h1 className="am-title">Mesas</h1>
          <p className="am-subtitle">Asigná meseros a las mesas por turno y fecha</p>
        </div>
        <button className="am-btn am-btn--primary" onClick={() => openCrud()}>
          + Nueva mesa
        </button>
      </div>

      {/* FILTROS */}
      <div className="am-filters">
        <div className="am-field">
          <label className="am-label">Fecha</label>
          <input type="date" className="am-input" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div className="am-field">
          <label className="am-label">Turno</label>
          <select className="am-input" value={turnoId} onChange={e => setTurnoId(e.target.value)}>
            {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="am-field am-field--count">
          <span className="am-count-label">Asignadas</span>
          <span className="am-count-value">{asignaciones.length}/{mesasActivas.length}</span>
        </div>
      </div>

      {/* GRILLA */}
      <div className="am-grid">
        {mesasActivas.map(mesa => {
          const asig = asignacionPorMesa(mesa.id);
          return (
            <button
              key={mesa.id}
              className={`am-car  d ${asig ? 'am-card--asignada' : 'am-card--libre'}`}
              onClick={() => handleClickMesa(mesa)}
            >
              <span className="am-card-numero">{mesa.numero}</span>
              <span className="am-card-capacidad">{mesa.capacidad} pers.</span>
              <span className="am-card-mesero">
                {asig ? asig.empleado_nombre : 'Sin asignar'}
              </span>
            </button>
          );
        })}
        {mesasInactivas.length > 0 && (
          <div className="am-grid-divider">Mesas inactivas</div>
        )}
        {mesasInactivas.map(mesa => (
          <button
            key={mesa.id}
            className="am-card am-card--inactiva"
            onClick={() => openCrud(mesa)}
          >
            <span className="am-card-numero">{mesa.numero}</span>
            <span className="am-card-capacidad">Inactiva</span>
          </button>
        ))}
      </div>

      {/* MODAL ASIGNAR */}
      {modalOpen && modalMesa && (
        <div className="am-modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="am-modal">
            <div className="am-modal-header">
              <h3>Mesa {modalMesa.numero}</h3>
              <button className="am-modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="am-modal-body">
              <p className="am-modal-info">Capacidad: {modalMesa.capacidad} personas</p>
              <div className="am-field">
                <label className="am-label">Mesero</label>
                <select className="am-input" value={selectedEmpleado} onChange={e => setSelectedEmpleado(e.target.value)}>
                  <option value="">Seleccionar mesero</option>
                  {meseros.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>
            </div>
            <div className="am-modal-footer">
              {asignacionPorMesa(modalMesa.id) && (
                <button className="am-btn am-btn--danger" onClick={handleDesasignar}>
                  Desasignar
                </button>
              )}
              <button className="am-btn am-btn--ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="am-btn am-btn--primary" onClick={handleAsignar} disabled={!selectedEmpleado}>
                Asignar
              </button>
            </div>
            <div className="am-modal-divider" />
            <div className="am-modal-footer am-modal-footer--danger">
              <button className="am-btn am-btn--danger-text" onClick={() => setToggleConfirm(modalMesa)}>
                Desactivar mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRUD MESA */}
      {crudModal && (
        <div className="am-modal-overlay" onClick={e => e.target === e.currentTarget && setCrudModal(false)}>
          <div className="am-modal am-modal--sm">
            <div className="am-modal-header">
              <h3>{editMesa ? 'Editar mesa' : 'Nueva mesa'}</h3>
              <button className="am-modal-close" onClick={() => setCrudModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveMesa}>
              <div className="am-modal-body">
                {mesaError && <p className="am-error">{mesaError}</p>}
                <div className="am-field">
                  <label className="am-label">Número</label>
                  <input className="am-input" type="number" value={formMesa.numero}
                    onChange={e => setFormMesa(p => ({ ...p, numero: parseInt(e.target.value) || '' }))}
                    required min={1} />
                </div>
                <div className="am-field">
                  <label className="am-label">Capacidad</label>
                  <input className="am-input" type="number" value={formMesa.capacidad}
                    onChange={e => setFormMesa(p => ({ ...p, capacidad: parseInt(e.target.value) || 1 }))}
                    required min={1} />
                </div>
                {editMesa && (
                  <div className="am-field">
                    <label className="am-checkbox-label">
                      <input type="checkbox" checked={formMesa.activa}
                        onChange={e => setFormMesa(p => ({ ...p, activa: e.target.checked }))} />
                      Mesa activa
                    </label>
                  </div>
                )}
              </div>
              <div className="am-modal-footer">
                {editMesa && (
                  <button type="button" className="am-btn am-btn--danger" onClick={() => setDeleteConfirm(editMesa)}>
                    Eliminar
                  </button>
                )}
                <button type="button" className="am-btn am-btn--ghost" onClick={() => setCrudModal(false)}>Cancelar</button>
                <button type="submit" className="am-btn am-btn--primary">
                  {editMesa ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Eliminar mesa"
        message={deleteConfirm ? `¿Eliminar la mesa ${deleteConfirm.numero}?` : ''}
        confirmText="Eliminar"
        confirmClass="ap-btn--danger"
        onConfirm={() => handleDeleteMesa(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        open={!!toggleConfirm}
        title="Desactivar mesa"
        message={toggleConfirm ? `¿estas seguro de desactivar la mesa numero ${toggleConfirm.numero}?.` : ''}
        confirmText="Desactivar"
        confirmClass="ap-btn--warning"
        onConfirm={() => handleToggleActiva(toggleConfirm)}
        onCancel={() => setToggleConfirm(null)}
      />
    </div>
  );
}
