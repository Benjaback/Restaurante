import React, { useEffect, useState, useRef, useCallback } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import api from '../../../services/api';

const PAGE_SIZE = 10;

const FORM_VACIO = {
  nombre: '', apellido: '', dni: '', fecha_nacimiento: '', direccion: '',
  fecha_contratacion: '', rol_id: '', turno_id: '',
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
      className={`ae-chevron ${open ? 'ae-chevron--open' : ''}`}
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
  const [turnos,          setTurnos]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);
  const [form,            setForm]            = useState(FORM_VACIO);

  // Filtros
  const [search,       setSearch]       = useState('');
  const [filtroRol,    setFiltroRol]    = useState('');
  const [filtroTurno,  setFiltroTurno]  = useState('');
  const [filtroActivo, setFiltroActivo] = useState('activo');
  const [page,         setPage]         = useState(1);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { loadEmpleados(); loadRoles(); loadTurnos(); }, []);

  // ── API ────────────────────────────────────────────────────────────────────
  const loadEmpleados = async () => {
    setLoading(true);
    try {
      setEmpleados(await api('/api/empleados/'));
    } catch {
      setError('No se pudieron cargar los empleados.');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      setRoles(await api('/api/roles/'));
    } catch {
      setError('No se pudieron cargar los roles.');
    }
  };

  const loadTurnos = async () => {
    try {
      setTurnos(await api('/api/turnos/'));
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    const url    = editingEmpleado ? `/api/empleados/${editingEmpleado.id}/` : '/api/empleados/';
    const method = editingEmpleado ? 'PATCH' : 'POST';
    try {
      const data = await api(url, { method, body: JSON.stringify(form) });
      closeModal();
      loadEmpleados();
      if (!editingEmpleado) {
        const pw = data.user_password ? `\n\nUsuario: ${form.dni}\nContraseña: ${data.user_password}` : '';
        setSuccess(`Empleado creado.${pw}`);
      }
    } catch (e) {
      setError(e.message || 'No se pudo guardar el empleado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      const emp = empleados.find(e => e.id === id);
      await api(`/api/empleados/${id}/`, { method: 'PATCH', body: JSON.stringify({ activo: !emp.activo }) });
      loadEmpleados();
    } catch {
      setError('Error al actualizar el estado del empleado.');
    }
  };

  // ── MODAL ──────────────────────────────────────────────────────────────────
  const openModal = () => { setEditingEmpleado(null); setForm(FORM_VACIO); setErrors({}); setModalOpen(true); };

  const handleEdit = (emp) => {
    setEditingEmpleado(emp);
    const f = {
      nombre: emp.nombre, apellido: emp.apellido || '', dni: emp.dni || '',
      fecha_nacimiento: emp.fecha_nacimiento || '', direccion: emp.direccion || '',
      fecha_contratacion: emp.fecha_contratacion || '',
      rol_id: emp.rol.id, turno_id: emp.turno?.id || '',
      telefono: emp.telefono, email: emp.email, activo: emp.activo,
    };
    setForm(f);
    const initialErrors = {};
    ['nombre','apellido','direccion','email','fecha_nacimiento','rol_id','turno_id','fecha_contratacion'].forEach(k => {
      initialErrors[k] = validarCampo(k, f);
    });
    initialErrors.dni = validarDni(f.dni);
    initialErrors.telefono = validarTelefono(f.telefono);
    setErrors(initialErrors);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingEmpleado(null); setForm(FORM_VACIO); setError(''); setErrors({}); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newForm;
    if (name === 'dni') {
      const soloDigitos = value.replace(/\D/g, '');
      newForm = { ...form, dni: soloDigitos };
      setForm(newForm);
      setErrors(prev => ({ ...prev, dni: validarDni(soloDigitos) }));
      return;
    }
    if (name === 'telefono') {
      const soloDigitos = value.replace(/\D/g, '');
      newForm = { ...form, telefono: soloDigitos };
      setForm(newForm);
      setErrors(prev => ({ ...prev, telefono: validarTelefono(soloDigitos) }));
      return;
    }
    newForm = { ...form, [name]: type === 'checkbox' ? checked : value };
    setForm(newForm);
    setErrors(prev => ({ ...prev, [name]: validarCampo(name, newForm) }));
  };

  // ── VALIDACIONES ─────────────────────────────────────────────────────────────
  const SECUENCIALES = ['12345678','23456789','34567890','45678901','56789012',
    '67890123','78901234','89012345','90123456','01234567','11111111','22222222',
    '33333333','44444444','55555555','66666666','77777777','88888888','99999999',
    '00000000'];

  function validarDni(v) {
    if (!v) return '';
    if (v.length < 6 || v.length > 9) return 'El DNI debe tener entre 6 y 9 dígitos';
    if (SECUENCIALES.includes(v)) return 'El DNI no puede ser secuencial o todos iguales';
    return '';
  }

  function validarTelefono(v) {
    if (!v) return '';
    if (v.length < 7 || v.length > 15) return 'El teléfono debe tener entre 7 y 15 dígitos';
    return '';
  }

  function validarCampo(name, form) {
    switch (name) {
      case 'nombre':
      case 'apellido':
      case 'direccion':
        return form[name].trim() ? '' : 'Este campo es obligatorio';
      case 'email': {
        if (!form.email.trim()) return '';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Email no válido';
      }
      case 'fecha_nacimiento': {
        if (!form.fecha_nacimiento) return '';
        const d = new Date(form.fecha_nacimiento + 'T00:00:00');
        if (isNaN(d.getTime())) return 'Fecha no válida';
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        return d >= hoy ? 'La fecha debe ser anterior a hoy' : '';
      }
      case 'rol_id':
      case 'turno_id':
        return form[name] ? '' : 'Este campo es obligatorio';
      case 'fecha_contratacion':
        return form.fecha_contratacion ? '' : 'Este campo es obligatorio';
      default:
        return '';
    }
  }

  function hasErrors() {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fechaInvalida = form.fecha_nacimiento && new Date(form.fecha_nacimiento + 'T00:00:00') >= hoy;
    return Object.values(errors).some(e => e) ||
      !form.nombre.trim() || !form.apellido.trim() || !form.direccion.trim() ||
      !form.rol_id || !form.turno_id || !form.fecha_contratacion ||
      !form.email.trim() || !form.fecha_nacimiento || fechaInvalida ||
      form.dni.length < 6 || form.dni.length > 9 ||
      form.telefono.length < 7 || form.telefono.length > 15;
  }

  const resetFiltros = () => {
    setSearch(''); setFiltroRol(''); setFiltroTurno(''); setFiltroActivo('activo'); setPage(1);
  };

  // ── FILTRADO Y PAGINACIÓN ──────────────────────────────────────────────────
  const filtered = empleados.filter(emp => {
    const texto      = search.toLowerCase();
    const matchTexto = !search ||
      emp.nombre.toLowerCase().includes(texto) ||
      (emp.apellido || '').toLowerCase().includes(texto) ||
      (emp.dni || '').includes(texto) ||
      emp.email.toLowerCase().includes(texto) ||
      (emp.rol?.nombre || '').toLowerCase().includes(texto);
    const matchRol    = !filtroRol    || String(emp.rol?.id) === filtroRol;
    const matchTurno  = !filtroTurno  || String(emp.turno?.id) === filtroTurno;
    const matchActivo = filtroActivo === '' ? true : filtroActivo === 'activo' ? emp.activo : !emp.activo;
    return matchTexto && matchRol && matchTurno && matchActivo;
  });

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hayFiltros  = search || filtroRol || filtroTurno || filtroActivo !== 'activo';
  const activeFiltrosCount = [filtroRol, filtroTurno, filtroActivo].filter(Boolean).length;

  const activos   = empleados.filter(e => e.activo).length;
  const inactivos = empleados.filter(e => !e.activo).length;

  // Opciones para dropdowns
  const rolesOptions  = roles.map(r => ({ value: String(r.id), label: r.nombre }));
  const turnosOptions = turnos.map(t => ({ value: String(t.id), label: t.nombre }));
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

      {success && (
        <div className="ae-success-bar">
          <span>{success}</span>
          <button className="ae-success-close" onClick={() => setSuccess('')}>&times;</button>
        </div>
      )}
      {error && !modalOpen && (
        <div className="ae-error-bar">
          <span>{error}</span>
          <button className="ae-error-close" onClick={() => setError('')}>&times;</button>
        </div>
      )}

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
              options={turnosOptions}
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
                    <th>DNI</th>
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
                        <td colSpan={8} className="ae-empty">
                        No se encontraron empleados con esos filtros.
                      </td>
                    </tr>
                  ) : (
                    paginated.map(emp => (
                      <tr key={emp.id}>
                        <td className="ae-td--bold">{emp.nombre} {emp.apellido}</td>
                        <td className="ae-td--mono">{emp.dni || '—'}</td>
                        <td>{emp.rol?.nombre}</td>
                        <td>
                          <span className="ae-badge ae-badge--turno">
                            {emp.turno?.nombre || '—'}
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
                              onClick={() => emp.activo ? setConfirmToggle(emp) : handleToggleActivo(emp.id)}
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

      <ConfirmModal
        open={!!confirmToggle}
        title="Desactivar empleado"
        message={confirmToggle ? `¿Estás seguro de desactivar a ${confirmToggle.nombre}?` : ''}
        confirmText="Desactivar"
        confirmClass="ap-btn--warning"
        onConfirm={() => { handleToggleActivo(confirmToggle.id); setConfirmToggle(null); }}
        onCancel={() => setConfirmToggle(null)}
      />

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
                <div className={`ae-form-field ${errors.nombre ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Nombre</label>
                  <input className="ae-input" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Juan" required />
                  {errors.nombre && <span className="ae-field-error">{errors.nombre}</span>}
                </div>
                <div className={`ae-form-field ${errors.apellido ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Apellido</label>
                  <input className="ae-input" name="apellido" value={form.apellido} onChange={handleChange} placeholder="Perez" required />
                  {errors.apellido && <span className="ae-field-error">{errors.apellido}</span>}
                </div>
                <div className={`ae-form-field ${errors.dni ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">DNI</label>
                  <input className="ae-input" name="dni" value={form.dni} onChange={handleChange} placeholder="45057828" required />
                  {errors.dni && <span className="ae-field-error">{errors.dni}</span>}
                </div>
                <div className={`ae-form-field ${errors.fecha_nacimiento ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Fecha de nacimiento</label>
                  <input className="ae-input" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} required />
                  {errors.fecha_nacimiento && <span className="ae-field-error">{errors.fecha_nacimiento}</span>}
                </div>
                <div className={`ae-form-field ${errors.fecha_contratacion ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Fecha de contratación</label>
                  <input className="ae-input" name="fecha_contratacion" type="date" value={form.fecha_contratacion} onChange={handleChange} required />
                  {errors.fecha_contratacion && <span className="ae-field-error">{errors.fecha_contratacion}</span>}
                </div>
                <div className={`ae-form-field ${errors.rol_id ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Rol</label>
                  <select className="ae-input" name="rol_id" value={form.rol_id} onChange={handleChange} required>
                    <option value="">Seleccionar rol</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  {errors.rol_id && <span className="ae-field-error">{errors.rol_id}</span>}
                </div>
                <div className={`ae-form-field ${errors.turno_id ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Turno</label>
                  <select className="ae-input" name="turno_id" value={form.turno_id} onChange={handleChange} required>
                    <option value="">Seleccionar turno</option>
                    {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                  {errors.turno_id && <span className="ae-field-error">{errors.turno_id}</span>}
                </div>
                <div className={`ae-form-field ${errors.telefono ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Teléfono</label>
                  <input className="ae-input" name="telefono" value={form.telefono} onChange={handleChange} placeholder="3874000000" required />
                  {errors.telefono && <span className="ae-field-error">{errors.telefono}</span>}
                </div>
                <div className={`ae-form-field ${errors.email ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Email</label>
                  <input className="ae-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="juan@ejemplo.com" required />
                  {errors.email && <span className="ae-field-error">{errors.email}</span>}
                </div>
                <div className={`ae-form-field ae-form-field--full ${errors.direccion ? 'ae-field--error' : ''}`}>
                  <label className="ae-label">Dirección</label>
                  <input className="ae-input" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Siempre Viva 123" required />
                  {errors.direccion && <span className="ae-field-error">{errors.direccion}</span>}
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
                <button type="submit" className="ae-btn ae-btn--primary" disabled={submitting || hasErrors()}>
                  {submitting ? 'Guardando…' : (editingEmpleado ? 'Guardar cambios' : 'Crear empleado')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
