import React, { useEffect, useState, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import ConfirmModal from '../../../components/ConfirmModal';
import api from '../../../services/api';

const FORM_VACIO = { nombre: '', categoria_id: '', stock: 0, precio_compra: '', unidad: 'unidad', stock_minimo: 0, activo: true };

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

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
    <div className={`ap-dropdown ${open ? 'ap-dropdown--open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`ap-dropdown-trigger ${hasValue ? 'ap-dropdown-trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ap-dropdown-label">{selected ? selected.label : label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`ap-chevron ${open ? 'ap-chevron--open' : ''}`}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {hasValue && (
          <span
            className="ap-dropdown-clear"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
            aria-label="Limpiar filtro"
          >
            <IconX />
          </span>
        )}
      </button>

      {open && (
        <div className="ap-dropdown-menu" role="listbox">
          <div className="ap-dropdown-header">{label}</div>
          <div className="ap-dropdown-options">
            <button
              type="button"
              className={`ap-dropdown-option ${value === '' ? 'ap-dropdown-option--selected' : ''}`}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              {placeholder}
              {value === '' && <span className="ap-dropdown-check">&#10003;</span>}
            </button>
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                className={`ap-dropdown-option ${value === o.value ? 'ap-dropdown-option--selected' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
                {value === o.value && <span className="ap-dropdown-check">&#10003;</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriaInput({ categorias, value, onChange, apiUrl, onCatsChange }) {
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState('');

  const crearCategoria = async () => {
    if (!nueva.trim()) return;
    try {
      const data = await api(apiUrl, {
        method: 'POST',
        body: JSON.stringify({ nombre: nueva.trim() }),
      });
      onCatsChange();
      onChange(data.id);
      setCreando(false);
      setNueva('');
    } catch {}
  };

  if (creando) {
    return (
      <div className="ap-cat-crear">
        <input className="ap-input" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nombre categoría" autoFocus />
        <button type="button" className="ap-btn ap-btn--success ap-btn--sm" onClick={crearCategoria}>OK</button>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setCreando(false)}>X</button>
      </div>
    );
  }

  return (
    <div className="ap-cat-field">
      <select className="ap-input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Sin categoría</option>
        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setCreando(true)} title="Nueva categoría">+</button>
    </div>
  );
}

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);

  const [search, setSearch] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [ajuste, setAjuste] = useState({});
  const [usosModal, setUsosModal] = useState(null);
  const [usosPlatos, setUsosPlatos] = useState([]);
  const [usosLoading, setUsosLoading] = useState(false);
  const [eliminados, setEliminados] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null);




  const load = useCallback(async () => {
    setLoading(true);
    try { setProductos(await api('/api/productos/')); } catch { setError('Error al cargar productos'); }
    setLoading(false);
  }, []);

  const loadCats = useCallback(async () => { try { setCategorias(await api('/api/categorias-producto/')); } catch {} }, []);

  useEffect(() => { load(); loadCats(); }, [load, loadCats]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 10000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api(editando ? `/api/productos/${editando.id}/` : '/api/productos/', {
        method: editando ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null }),
      });
      setModal(false); setEditando(null); setForm(FORM_VACIO); load();
    } catch (e) { setError(e.message); }
  };

  const openModal = (p) => {
    if (p) { setEditando(p); setForm({ nombre: p.nombre, categoria_id: p.categoria?.id || '', stock: p.stock, precio_compra: p.precio_compra ?? '', unidad: p.unidad, stock_minimo: p.stock_minimo, activo: p.activo }); }
    else { setEditando(null); setForm(FORM_VACIO); }
    setModal(true);
  };

  const ajustarStock = async (p, delta) => {
    const cantidad = parseFloat(ajuste[p.id]) || 1;
    const nuevoStock = Math.max(0, parseFloat(p.stock) + delta * cantidad);
    try {
      await api(`/api/productos/${p.id}/`, { method: 'PATCH', body: JSON.stringify({ stock: nuevoStock }) });
      load();
    } catch { setError('Error al ajustar stock'); }
  };

  const verUsos = async (p) => {
    setUsosModal(p);
    setUsosLoading(true);
    try {
      const data = await api(`/api/productos/${p.id}/usos/`);
      setUsosPlatos(data);
    } catch { setUsosPlatos([]); }
    setUsosLoading(false);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Productos', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 30);
    const rows = filtered.map(p => [
      p.nombre,
      p.categoria?.nombre || '—',
      `${p.stock} ${p.unidad}`,
      p.precio_compra ? `$${Number(p.precio_compra).toFixed(2)}` : '—',
      `${p.stock_minimo} ${p.unidad}`,
      p.activo ? 'Activo' : 'Inactivo',
    ]);
    autoTable(doc, {
      head: [['Producto', 'Categoría', 'Stock', 'Precio compra', 'Stock mínimo', 'Estado']],
      body: rows,
      startY: 36,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [44, 26, 14] },
    });
    doc.save(`productos_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const lowStock = (p) => p.activo && p.stock <= p.stock_minimo;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const filtered = productos.filter(p => {
    if (eliminados.has(p.id)) return false;
    const texto = search.toLowerCase();
    const matchTexto = !search ||
      p.nombre.toLowerCase().includes(texto) ||
      (p.categoria?.nombre || '').toLowerCase().includes(texto);
    const matchCat = !filtroCat || String(p.categoria?.id) === filtroCat;
    const matchEstado = filtroEstado === '' ? true : filtroEstado === 'activo' ? p.activo : !p.activo;
    return matchTexto && matchCat && matchEstado;
  });

  const resetFiltros = () => { setSearch(''); setFiltroCat(''); setFiltroEstado('activo'); };

  const total = productos.filter(p => !eliminados.has(p.id)).length;
  const bajos = productos.filter(p => !eliminados.has(p.id) && lowStock(p)).length;
  const inactivos = productos.filter(p => !eliminados.has(p.id) && !p.activo).length;

  const catsOptions = categorias.map(c => ({ value: String(c.id), label: c.nombre }));
  const estadoOptions = [
    { value: 'activo', label: 'Solo activos' },
    { value: 'inactivo', label: 'Solo inactivos' },
  ];

  const hayFiltros = search || filtroCat || filtroEstado !== 'activo';

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div>
          <p className="ap-eyebrow">Inventario</p>
          <h1 className="ap-title">Productos</h1>
          <p className="ap-subtitle">Gestiona los ingredientes y su stock.</p>
        </div>
        <button className="ap-btn ap-btn--primary" onClick={() => openModal(null)}>Agregar producto</button>
      </header>

      <div className="ap-stats">
        <div className="ap-stat-card"><span className="ap-stat-label">Total</span><span className="ap-stat-value">{total}</span></div>
        <div className="ap-stat-card"><span className="ap-stat-label">Stock bajo</span><span className="ap-stat-value ap-stat-value--danger">{bajos}</span></div>
        <div className="ap-stat-card"><span className="ap-stat-label">Inactivos</span><span className="ap-stat-value ap-stat-value--muted">{inactivos}</span></div>
      </div>

      {error && <div className="ap-error-bar">{error}</div>}

      <div className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-search-wrap">
            <svg className="ap-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="ap-input ap-search"
              type="text"
              placeholder="Buscar por nombre o categoría..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="ap-search-clear" onClick={() => setSearch('')} aria-label="Limpiar busqueda">
                <IconX />
              </button>
            )}
          </div>

          <div className="ap-filter-group">
            <FilterDropdown
              label="Categoría"
              placeholder="Todas"
              value={filtroCat}
              onChange={v => setFiltroCat(v)}
              options={catsOptions}
            />
            <FilterDropdown
              label="Estado"
              placeholder="Todos"
              value={filtroEstado}
              onChange={v => setFiltroEstado(v)}
              options={estadoOptions}
            />
            {hayFiltros && (
              <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={resetFiltros}>
                Limpiar
              </button>
            )}
            <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={exportarPDF} title="Exportar PDF">
              Exportar PDF
            </button>
          </div>
        </div>

        {hayFiltros && (
          <p className="ap-results-count">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {loading ? <div className="ap-loading">Cargando…</div> : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Precio compra</th>
                  <th>Stock mínimo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="ap-empty">No hay productos.</td></tr>
                  ) : (
                    filtered.map(p => (
                      <tr key={p.id} className={lowStock(p) ? 'ap-row--warning' : ''}>
                        <td className="ap-td--bold">{p.nombre}</td>
                        <td>{p.categoria?.nombre || '—'}</td>
                        <td className={lowStock(p) ? 'ap-text--danger' : ''}>
                          <span className="ap-stock-value">{p.stock} {p.unidad}</span>
                          {p.es_elaborado ? (
                            <span style={{ marginLeft: 8, fontSize: 10, verticalAlign: 'middle', display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: '#1a4d6b', color: '#b8d9f0', fontWeight: 600, letterSpacing: 0.3 }}>Elaborado</span>
                          ) : (
                            <span className="ap-ajuste">
                              <input
                                className="ap-input ap-input--xs"
                                type="number" step="0.01" min="0"
                                value={ajuste[p.id] ?? 1}
                                onChange={e => setAjuste(prev => ({ ...prev, [p.id]: e.target.value }))}
                              />
                              <button className="ap-btn ap-btn--success ap-btn--xs" onClick={() => ajustarStock(p, 1)} title="Sumar">+</button>
                              <button className="ap-btn ap-btn--danger ap-btn--xs" onClick={() => ajustarStock(p, -1)} title="Restar">−</button>
                            </span>
                          )}
                        </td>
                        <td>{p.precio_compra ? `$${Number(p.precio_compra).toFixed(2)}` : '—'}</td>
                        <td className="ap-text--muted">{p.stock_minimo} {p.unidad}</td>
                        <td><span className={`ap-badge ${p.activo ? 'ap-badge--ok' : 'ap-badge--no'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <div className="ap-actions">
                            <button className="ap-btn ap-btn--ghost" onClick={() => openModal(p)}>Editar</button>
                            <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => verUsos(p)}>Ver uso</button>
                            {p.activo ? (
                              <button className="ap-btn ap-btn--warning ap-btn--sm" onClick={() => setConfirmDelete({ action: 'desactivar', producto: p })}>Desactivar</button>
                            ) : (
                              <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => setConfirmDelete({ action: 'eliminar', producto: p })}>Eliminar</button>
                            )}
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

      {modal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setModal(false); setForm(FORM_VACIO); }}}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>{editando ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button className="ap-modal-close" onClick={() => { setModal(false); setForm(FORM_VACIO); }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="ap-form">
              <div className="ap-form-grid">
                <div className="ap-field">
                  <label>Nombre</label>
                  <input className="ap-input" name="nombre" value={form.nombre} onChange={handleChange} required />
                </div>
                <div className="ap-field">
                  <label>Categoría</label>
                  <CategoriaInput
                    categorias={categorias}
                    value={form.categoria_id}
                    onChange={v => setForm(prev => ({ ...prev, categoria_id: v }))}
                    apiUrl="/api/categorias-producto/"
                    onCatsChange={loadCats}
                  />
                </div>
                <div className="ap-field">
                  <label>Stock actual</label>
                  <input className="ap-input" name="stock" type="number" step="0.01" value={form.stock} onChange={handleChange} />
                </div>
                <div className="ap-field">
                  <label>Precio de compra</label>
                  <input className="ap-input" name="precio_compra" type="number" step="0.01" value={form.precio_compra} onChange={handleChange} placeholder="Opcional" />
                </div>
                <div className="ap-field">
                  <label>Unidad</label>
                  <select className="ap-input" name="unidad" value={form.unidad} onChange={handleChange}>
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="g">Gramo</option>
                    <option value="l">Litro</option>
                    <option value="ml">Mililitro</option>
                    <option value="paquete">Paquete</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label>Stock mínimo</label>
                  <input className="ap-input" name="stock_minimo" type="number" step="0.01" value={form.stock_minimo} onChange={handleChange} />
                </div>
                <div className="ap-field ap-field--checkbox">
                  <label><input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} /> Producto activo</label>
                </div>
              </div>
              {error && <p className="ap-error">{error}</p>}
              <div className="ap-modal-footer">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => { setModal(false); setForm(FORM_VACIO); }}>Cancelar</button>
                <button type="submit" className="ap-btn ap-btn--primary">{editando ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title={confirmDelete?.action === 'desactivar' ? 'Desactivar producto' : 'Eliminar producto'}
        message={confirmDelete ? (
          confirmDelete.action === 'desactivar'
            ? `¿Estás seguro de desactivar ${confirmDelete.producto.nombre}?`
            : `¿Estás seguro de eliminar ${confirmDelete.producto.nombre}? Esta acción no se puede deshacer.`
        ) : ''}
        confirmText={confirmDelete?.action === 'desactivar' ? 'Desactivar' : 'Eliminar'}
        confirmClass={confirmDelete?.action === 'desactivar' ? 'ap-btn--warning' : 'ap-btn--danger'}
        onConfirm={async () => {
          if (confirmDelete.action === 'desactivar') {
            try {
              await api(`/api/productos/${confirmDelete.producto.id}/`, { method: 'PATCH', body: JSON.stringify({ activo: false }) });
              setConfirmDelete(null);
              load();
            } catch { setError('Error al desactivar'); }
          } else {
            try {
              const usos = await api(`/api/productos/${confirmDelete.producto.id}/usos/`);
              if (usos.length > 0) {
                setError(`No se puede eliminar ${confirmDelete.producto.nombre} porque se usa en ${usos.length} plato${usos.length > 1 ? 's' : ''}.`);
                setConfirmDelete(null);
                return;
              }
              setEliminados(prev => new Set(prev).add(confirmDelete.producto.id));
              setConfirmDelete(null);
            } catch (e) { setError(e.message); }
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {usosModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setUsosModal(null); setUsosPlatos([]); }}}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Usos de {usosModal.nombre}</h3>
              <button className="ap-modal-close" onClick={() => { setUsosModal(null); setUsosPlatos([]); }}>&times;</button>
            </div>
            {usosLoading ? <p className="ap-loading">Cargando…</p> : usosPlatos.length === 0 ? (
              <p className="ap-empty ap-empty--padded">No se usa en ningún plato.</p>
            ) : (
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Plato</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {usosPlatos.map(u => (
                    <tr key={u.id}>
                      <td className="ap-td--bold">{u.nombre}</td>
                      <td>{u.categoria || '—'}</td>
                      <td>${u.precio.toFixed(2)}</td>
                      <td>{u.cantidad}</td>
                      <td><span className={`ap-badge ${u.activo ? 'ap-badge--ok' : 'ap-badge--no'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="ap-modal-footer">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => { setUsosModal(null); setUsosPlatos([]); }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
