import React, { useEffect, useState, useRef, useCallback } from 'react';
import './admin-empleados.css';

const SHIFT_OPTIONS = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde',  label: 'Tarde'  },
  { value: 'noche',  label: 'Noche'  },
];

const PAGE_SIZE = 10;

const FORM_VACIO = {
  nombre: '', rol_id: '', turno: 'manana',
  telefono: '', email: '', activo: true,
};

// ── ICONO SVG ─────────────────────────────────────────────────────────────────
const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconChevron = ({ open }) => (
  <svg
    width="12" height="12" viewBox="0 0 12 12" fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
  >
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

// ── FILTER DROPDOWN ───────────────────────────────────────────────────────────
function FilterDropdown({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  const selected = options.find(o => o.value === value);
  const hasValue = value !== '';

  return (
    <div className={`ae-dropdown ${open ? 'ae-dropdown--open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`ae-dropdown-trigger ${hasValue ? 'ae-dropdown-trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ae-dropdown-label">{selected ? selected.label : label}</span>
        <IconChevron open={open} />
        {hasValue && (
          <span
            className="ae-dropdown-clear"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
            aria-label="Limpiar filtro"
          >
            <IconX />
          </span>
        )}
      </button>

      {open && (
        <div className="ae-dropdown-menu" role="listbox">
          <div className="ae-dropdown-header">{label}</div>
          <div className="ae-dropdown-options">
            <button
              type="button"
              className={`ae-dropdown-option ${value === '' ? 'ae-dropdown-option--selected' : ''}`}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              {placeholder}
              {value === '' && <span className="ae-dropdown-check">&#10003;</span>}
            </button>
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                className={`ae-dropdown-option ${value === o.value ? 'ae-dropdown-option--selected' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
                {value === o.value && <span className="ae-dropdown-check">&#10003;</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function AdminEmpleados() {
  const [empleados,       setEmpleados]       = useState([]);
  const [roles,           setRoles]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);
  const [form,            setForm]            = useState(FORM_VACIO);

  // Filtros
  const [search,       setSearch]       = useState('');
  const [filtroRol,    setFiltroRol]    = useState('');
  const [filtroTurno,  setFiltroTurno]  = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [page,         setPage]         = useState(1);

  useEffect(() => { loadEmpleados(); loadRoles(); }, []);

  // ── API ────────────────────────────────────────────────────────────────────
  const loadEmpleados = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/empleados/');
      const data = await res.json();
      setEmpleados(data);
    } catch {
      setError('No se pudieron cargar los empleados.');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res  = await fetch('/api/roles/');
      const data = await res.json();
      setRoles(data);
    } catch {
      setError('No se pudieron cargar los roles.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const url    = editingEmpleado ? `/api/empleados/${editingEmpleado.id}/` : '/api/empleados/';
    const method = editingEmpleado ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      closeModal();
      loadEmpleados();
    } catch {
      setError('No se pudo guardar el empleado.');
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      const emp = empleados.find(e => e.id === id);
      await fetch(`/api/empleados/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !emp.activo }),
      });
      loadEmpleados();
    } catch {
      setError('Error al actualizar el estado del empleado.');
    }
  };

  // ── MODAL ──────────────────────────────────────────────────────────────────
  const openModal = () => { setEditingEmpleado(null); setForm(FORM_VACIO); setModalOpen(true); };

  const handleEdit = (emp) => {
    setEditingEmpleado(emp);
    setForm({ nombre: emp.nombre, rol_id: emp.rol.id, turno: emp.turno, telefono: emp.telefono, email: emp.email, activo: emp.activo });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingEmpleado(null); setForm(FORM_VACIO); setError(''); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetFiltros = () => {
    setSearch(''); setFiltroRol(''); setFiltroTurno(''); setFiltroActivo(''); setPage(1);
  };

  // ── FILTRADO Y PAGINACIÓN ──────────────────────────────────────────────────
  const filtered = empleados.filter(emp => {
    const texto      = search.toLowerCase();
    const matchTexto = !search ||
      emp.nombre.toLowerCase().includes(texto) ||
      emp.email.toLowerCase().includes(texto) ||
      (emp.rol?.nombre || '').toLowerCase().includes(texto);
    const matchRol    = !filtroRol    || String(emp.rol?.id) === filtroRol;
    const matchTurno  = !filtroTurno  || emp.turno === filtroTurno;
    const matchActivo = filtroActivo === '' ? true : filtroActivo === 'activo' ? emp.activo : !emp.activo;
    return matchTexto && matchRol && matchTurno && matchActivo;
  });

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hayFiltros  = search || filtroRol || filtroTurno || filtroActivo !== '';
  const activeFiltrosCount = [filtroRol, filtroTurno, filtroActivo].filter(Boolean).length;

  const activos   = empleados.filter(e => e.activo).length;
  const inactivos = empleados.filter(e => !e.activo).length;

  // Opciones para dropdowns
  const rolesOptions  = roles.map(r => ({ value: String(r.id), label: r.nombre }));
  const activoOptions = [{ value: 'activo', label: 'Solo activos' }, { value: 'inactivo', label: 'Solo inactivos' }];

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="ae-root">

      {/* HEADER */}
      <header className="ae-header">
        <div>
          <p className="ae-eyebrow">Personal del restaurante</p>
          <h1 className="ae-title">Gestion de empleados</h1>
          <p className="ae-subtitle">Crea, revisa y activa o desactiva al personal del restaurante.</p>
        </div>
        <button className="ae-btn ae-btn--primary" onClick={openModal}>
          Agregar empleado
        </button>
      </header>

      {/* STATS */}
      <div className="ae-stats">
        <div className="ae-stat-card">
          <span className="ae-stat-label">Total de empleados</span>
          <span className="ae-stat-value">{empleados.length}</span>
        </div>
        <div className="ae-stat-card">
          <span className="ae-stat-label">Activos</span>
          <span className="ae-stat-value ae-stat-value--green">{activos}</span>
        </div>
        <div className="ae-stat-card">
          <span className="ae-stat-label">No activos</span>
          <span className="ae-stat-value ae-stat-value--muted">{inactivos}</span>
        </div>
      </div>

      {/* PANEL PRINCIPAL */}
      <div className="ae-panel">

        {/* BARRA: BUSCADOR + FILTROS */}
        <div className="ae-toolbar">
          {/* Buscador */}
          <div className="ae-search-wrap">
            <svg className="ae-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="ae-input ae-search"
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="ae-search-clear" onClick={() => { setSearch(''); setPage(1); }} aria-label="Limpiar busqueda">
                <IconX />
              </button>
            )}
          </div>

          {/* Filtros como dropdowns */}
          <div className="ae-filter-group">
            <div className="ae-filter-icon-wrap">
              <IconFilter />
              {activeFiltrosCount > 0 && (
                <span className="ae-filter-badge">{activeFiltrosCount}</span>
              )}
            </div>

            <FilterDropdown
              label="Rol"
              placeholder="Todos los roles"
              value={filtroRol}
              onChange={v => { setFiltroRol(v); setPage(1); }}
              options={rolesOptions}
            />

            <FilterDropdown
              label="Turno"
              placeholder="Todos los turnos"
              value={filtroTurno}
              onChange={v => { setFiltroTurno(v); setPage(1); }}
              options={SHIFT_OPTIONS}
            />

            <FilterDropdown
              label="Estado"
              placeholder="Todos"
              value={filtroActivo}
              onChange={v => { setFiltroActivo(v); setPage(1); }}
              options={activoOptions}
            />

            {hayFiltros && (
              <button className="ae-btn ae-btn--ghost ae-btn--sm" onClick={resetFiltros}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* CONTADOR DE RESULTADOS */}
        {hayFiltros && (
          <p className="ae-results-count">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* TABLA */}
        {loading ? (
          <div className="ae-loading">Cargando empleados...</div>
        ) : (
          <>
            <div className="ae-table-wrap">
              <table className="ae-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Turno</th>
                    <th>Telefono</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="ae-empty">
                        No se encontraron empleados con esos filtros.
                      </td>
                    </tr>
                  ) : (
                    paginated.map(emp => (
                      <tr key={emp.id}>
                        <td className="ae-td--bold">{emp.nombre}</td>
                        <td>{emp.rol?.nombre}</td>
                        <td>
                          <span className="ae-badge ae-badge--turno">
                            {SHIFT_OPTIONS.find(s => s.value === emp.turno)?.label || emp.turno}
                          </span>
                        </td>
                        <td className="ae-td--mono">{emp.telefono}</td>
                        <td className="ae-td--muted">{emp.email}</td>
                        <td>
                          <span className={`ae-badge ${emp.activo ? 'ae-badge--activo' : 'ae-badge--inactivo'}`}>
                            {emp.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className="ae-actions">
                            <button className="ae-btn ae-btn--ghost ae-btn--sm" onClick={() => handleEdit(emp)}>
                              Editar
                            </button>
                            <button
                              className={`ae-btn ae-btn--sm ${emp.activo ? 'ae-btn--danger' : 'ae-btn--success'}`}
                              onClick={() => handleToggleActivo(emp.id)}
                            >
                              {emp.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="ae-pagination">
                <button
                  className="ae-btn ae-btn--ghost ae-btn--sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </button>
                <span className="ae-page-info">Pagina {page} de {totalPages}</span>
                <button
                  className="ae-btn ae-btn--ghost ae-btn--sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL EMPLEADO */}
      {modalOpen && (
        <div className="ae-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="ae-modal">
            <div className="ae-modal-header">
              <h3 className="ae-modal-title">
                {editingEmpleado ? 'Editar empleado' : 'Nuevo empleado'}
              </h3>
              <button className="ae-modal-close" onClick={closeModal} aria-label="Cerrar">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="ae-form">
              <div className="ae-form-grid">
                <div className="ae-form-field">
                  <label className="ae-label">Nombre</label>
                  <input className="ae-input" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Juan Perez" required />
                </div>
                <div className="ae-form-field">
                  <label className="ae-label">Rol</label>
                  <select className="ae-input" name="rol_id" value={form.rol_id} onChange={handleChange} required>
                    <option value="">Seleccionar rol</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div className="ae-form-field">
                  <label className="ae-label">Turno</label>
                  <select className="ae-input" name="turno" value={form.turno} onChange={handleChange}>
                    {SHIFT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="ae-form-field">
                  <label className="ae-label">Telefono</label>
                  <input className="ae-input" name="telefono" value={form.telefono} onChange={handleChange} placeholder="3874000000" />
                </div>
                <div className="ae-form-field ae-form-field--full">
                  <label className="ae-label">Email</label>
                  <input className="ae-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="juan@ejemplo.com" />
                </div>
                <div className="ae-form-field ae-form-field--full ae-form-field--checkbox">
                  <label className="ae-checkbox-label">
                    <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="ae-checkbox" />
                    Empleado activo
                  </label>
                </div>
              </div>

              {error && <p className="ae-error">{error}</p>}

              <div className="ae-modal-footer">
                <button type="button" className="ae-btn ae-btn--ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="ae-btn ae-btn--primary">
                  {editingEmpleado ? 'Guardar cambios' : 'Crear empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}