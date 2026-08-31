import React, { useEffect, useState, useCallback, useRef } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import api, { apiUpload } from '../../../services/api';

const IconChevron = ({ open }) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={`apl-chevron ${open ? 'apl-chevron--open' : ''}`}>
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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
    <div className={`apl-dropdown ${open ? 'apl-dropdown--open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`apl-dropdown-trigger ${hasValue ? 'apl-dropdown-trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="apl-dropdown-label">{selected ? selected.label : label}</span>
        <IconChevron open={open} />
        {hasValue && (
          <span
            className="apl-dropdown-clear"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
            aria-label="Limpiar filtro"
          >
            <IconX />
          </span>
        )}
      </button>

      {open && (
        <div className="apl-dropdown-menu" role="listbox">
          <div className="apl-dropdown-header">{label}</div>
          <div className="apl-dropdown-options">
            <button
              type="button"
              className={`apl-dropdown-option ${value === '' ? 'apl-dropdown-option--selected' : ''}`}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              {placeholder}
              {value === '' && <span className="apl-dropdown-check">&#10003;</span>}
            </button>
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                className={`apl-dropdown-option ${value === o.value ? 'apl-dropdown-option--selected' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
                {value === o.value && <span className="apl-dropdown-check">&#10003;</span>}
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
      <div className="apl-cat-crear">
        <input className="apl-input" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nombre categoría" autoFocus />
        <button type="button" className="apl-btn apl-btn--success apl-btn--sm" onClick={crearCategoria}>OK</button>
        <button type="button" className="apl-btn apl-btn--ghost apl-btn--sm" onClick={() => setCreando(false)}>X</button>
      </div>
    );
  }

  return (
    <div className="apl-cat-field">
      <select className="apl-input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Sin categoría</option>
        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <button type="button" className="apl-btn apl-btn--ghost apl-btn--sm" onClick={() => setCreando(true)} title="Nueva categoría">+</button>
    </div>
  );
}

export default function AdminPlatos() {
  const [platos, setPlatos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recetaError, setRecetaError] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', precio: 0, categoria_id: '', descripcion: '', imagen: '', activo: true, recetas: [] });
  const [ordenando, setOrdenando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [search, setSearch] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [alertaOrden, setAlertaOrden] = useState(null);
  const [cartaModal, setCartaModal] = useState(false);

  const [subiendoImg, setSubiendoImg] = useState(false);

  const uploadImagen = async (file) => {
    const fd = new FormData();
    fd.append('imagen', file);
    try {
      setSubiendoImg(true);
      const data = await apiUpload('/api/upload-imagen/', fd);
      setForm(prev => ({ ...prev, imagen: data.url }));
    } catch (e) { setError(e.message); }
    setSubiendoImg(false);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, pr] = await Promise.all([
        api('/api/platos/'),
        api('/api/categorias-plato/'),
        api('/api/productos/'),
      ]);
      setPlatos(p); setCategorias(c); setProductos(pr);
    } catch { setError('Error al cargar datos'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openModal = (plato) => {
    setRecetaError('');
    if (plato) {
      setEditando(plato);
      setForm({
        nombre: plato.nombre,
        precio: plato.precio,
        categoria_id: plato.categoria?.id || '',
        descripcion: plato.descripcion,
        imagen: plato.imagen || '',
        activo: plato.activo,
        recetas: plato.recetas.map(r => ({ producto_id: r.producto_id, cantidad: r.cantidad })),
      });
    } else {
      setEditando(null);
      setForm({ nombre: '', precio: 0, categoria_id: '', descripcion: '', imagen: '', activo: true, recetas: [] });
    }
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    setRecetaError('');
    try {
      await api(editando ? `/api/platos/${editando.id}/` : '/api/platos/', {
        method: editando ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null }),
      });
      setModal(false); setEditando(null); loadAll();
    } catch (e) { setError(e.message); }
  };

  const addReceta = () => {
    setRecetaError('');
    setForm(prev => ({ ...prev, recetas: [...prev.recetas, { producto_id: '', cantidad: 0 }] }));
  };

  const removeReceta = (idx) => {
    setRecetaError('');
    setForm(prev => ({ ...prev, recetas: prev.recetas.filter((_, i) => i !== idx) }));
  };

  const updateReceta = (idx, field, value) => {
    if (field === 'producto_id' && value) {
      const exists = form.recetas.findIndex((r, i) => i !== idx && String(r.producto_id) === String(value));
      if (exists !== -1) {
        setRecetaError('El producto ya está en la receta. Aumentá la cantidad del producto ya agregado.');
        return;
      }
    }
    setRecetaError('');
    setForm(prev => {
      const recetas = [...prev.recetas];
      recetas[idx] = { ...recetas[idx], [field]: value };
      return { ...prev, recetas };
    });
  };

  const toggleActivo = async (plato) => {
    setError('');
    try {
      await api(`/api/platos/${plato.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !plato.activo }),
      });
      loadAll();
    } catch (e) { setError(e.message); }
  };

  const eliminar = async (id) => {
    setError('');
    try {
      await api(`/api/platos/${id}/`, { method: 'DELETE' });
      setConfirmDelete(null);
      loadAll();
    } catch (e) { setError(e.message); }
  };

  const ordenar = async (plato) => {
    setOrdenando(plato.id);
    setError('');
    setAlertaOrden(null);
    try {
      const data = await api('/api/ordenar/', { method: 'POST', body: JSON.stringify({ plato_id: plato.id, cantidad: 1 }) });
      if (data.productos_desactivados || data.platos_desactivados) {
        setAlertaOrden(data);
      }
      loadAll();
    } catch (e) { setError(e.message); }
    setOrdenando(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const getProductoById = (id) => productos.find(p => String(p.id) === String(id));

  const productoEstaBajo = (producto) => producto && producto.activo && Number(producto.stock) <= Number(producto.stock_minimo);

  const filtered = platos.filter(p => {
    const texto = search.toLowerCase();
    const matchTexto = !search ||
      p.nombre.toLowerCase().includes(texto) ||
      (p.categoria?.nombre || '').toLowerCase().includes(texto);
    const matchCat = !filtroCat || String(p.categoria?.id) === filtroCat;
    const matchEstado = filtroEstado === '' ? true : filtroEstado === 'activo' ? p.activo : !p.activo;
    return matchTexto && matchCat && matchEstado;
  });

  const resetFiltros = () => { setSearch(''); setFiltroCat(''); setFiltroEstado(''); };

  const hayFiltros = search || filtroCat || filtroEstado;

  return (
    <div className="apl-root">
      <header className="apl-header">
        <div>
          <p className="apl-eyebrow">Carta</p>
          <h1 className="apl-title">Platos</h1>
          <p className="apl-subtitle">Crea platos con sus recetas y controla el inventario.</p>
        </div>
        <div className="apl-header-actions">
          <button className="apl-btn apl-btn--ghost" onClick={() => setCartaModal(true)}>
            📄 Vista previa de carta
          </button>
          <button className="apl-btn apl-btn--primary" onClick={() => openModal(null)}>Agregar plato</button>
        </div>
      </header>

      {error && <div className="apl-error-bar">{error}</div>}

      {alertaOrden && (
        <div className="apl-alerta">
          <strong>⚠️ Pedido realizado</strong>
          {alertaOrden.productos_desactivados?.length > 0 && (
            <p>Productos agotados y desactivados: {alertaOrden.productos_desactivados.join(', ')}.</p>
          )}
          {alertaOrden.platos_desactivados?.length > 0 && (
            <p>Platos desactivados por falta de productos: {alertaOrden.platos_desactivados.join(', ')}.</p>
          )}
          <button className="apl-btn apl-btn--ghost apl-btn--sm" onClick={() => setAlertaOrden(null)}>Cerrar</button>
        </div>
      )}

      <div className="apl-stats">
        <div className="apl-stat-card"><span className="apl-stat-label">Total</span><span className="apl-stat-value">{platos.length}</span></div>
        <div className="apl-stat-card"><span className="apl-stat-label">Activos</span><span className="apl-stat-value apl-stat-value--green">{platos.filter(p => p.activo).length}</span></div>
        <div className="apl-stat-card"><span className="apl-stat-label">Inactivos</span><span className="apl-stat-value apl-stat-value--muted">{platos.filter(p => !p.activo).length}</span></div>
      </div>

      <div className="apl-panel">
        <div className="apl-toolbar">
          <div className="apl-search-wrap">
            <svg className="apl-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="apl-input apl-search"
              type="text"
              placeholder="Buscar por nombre o categoría..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="apl-search-clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                ✕
              </button>
            )}
          </div>

          <div className="apl-filter-group">
            <FilterDropdown
              label="Categoría"
              placeholder="Todas las categorías"
              value={filtroCat}
              onChange={v => setFiltroCat(v)}
              options={categorias.map(c => ({ value: String(c.id), label: c.nombre }))}
            />
            <FilterDropdown
              label="Estado"
              placeholder="Todos los estados"
              value={filtroEstado}
              onChange={v => setFiltroEstado(v)}
              options={[
                { value: 'activo', label: 'Solo activos' },
                { value: 'inactivo', label: 'Solo inactivos' },
              ]}
            />
            {hayFiltros && (
              <button className="apl-btn apl-btn--ghost apl-btn--sm" onClick={resetFiltros}>Limpiar</button>
            )}
          </div>
        </div>

        {hayFiltros && (
          <p className="apl-results-count">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
        )}

        {loading ? <div className="apl-loading">Cargando…</div> : (
          <div className="apl-grid">
            {filtered.length === 0 ? (
              <div className="apl-empty">No hay platos.</div>
            ) : (
              filtered.map(p => {
                const tieneProductoInactivo = p.recetas.some(r => {
                  const prod = getProductoById(r.producto_id);
                  return prod && !prod.activo;
                });
                const tieneStockBajo = p.recetas.some(r => {
                  const prod = getProductoById(r.producto_id);
                  return productoEstaBajo(prod);
                });
                return (
                <div key={p.id} className={`apl-card ${!p.activo ? 'apl-card--inactive' : ''} ${tieneProductoInactivo ? 'apl-card--sin-stock' : ''} ${tieneStockBajo && p.activo ? 'apl-card--bajo' : ''}`}>
                  <div className="apl-card-header">
                    <h3>{p.nombre}</h3>
                    <div className="apl-card-badges">
                      {tieneProductoInactivo && <span className="apl-badge apl-badge--no-stock" title="Tiene productos inactivos">Sin stock</span>}
                      {tieneStockBajo && p.activo && <span className="apl-badge apl-badge--bajo" title="Hay productos con stock bajo">Stock bajo</span>}
                      <span className={`apl-badge ${p.activo ? 'apl-badge--ok' : 'apl-badge--no'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </div>
                  {p.categoria && <span className="apl-card-cat">{p.categoria.nombre}</span>}
                  <p className="apl-card-price">${p.precio.toFixed(2)}</p>
                  {p.costo != null && (
                    <p className="apl-card-costo">
                      Costo: ${Number(p.costo).toFixed(2)}
                      {p.precio > 0 && (
                        <span className={`apl-margin ${(p.precio - p.costo) / p.precio >= 0.3 ? 'apl-margin--ok' : 'apl-margin--low'}`}>
                          ({((p.precio - p.costo) / p.precio * 100).toFixed(0)}% margen)
                        </span>
                      )}
                    </p>
                  )}
                  {p.descripcion && <p className="apl-card-desc">{p.descripcion}</p>}
                  {p.recetas.length > 0 && (
                    <div className="apl-card-recetas">
                      <strong>Receta:</strong>
                      <ul>
                        {p.recetas.map(r => {
                          const prod = getProductoById(r.producto_id);
                          const bajo = productoEstaBajo(prod);
                          return (
                          <li key={r.id} className={!prod?.activo ? 'apl-receta-item--inactivo' : bajo ? 'apl-receta-item--bajo' : ''}>
                            {r.cantidad} {r.producto_unidad} de {r.producto_nombre}
                            {!prod?.activo && ' ⛔'}
                            {bajo && ' ⚠️'}
                          </li>
                        );})}
                      </ul>
                    </div>
                  )}
                  <div className="apl-card-actions">
                    <button className="apl-btn apl-btn--ghost" onClick={() => openModal(p)}>Editar</button>
                    {p.activo && p.recetas.length > 0 && (
                      <button className="apl-btn apl-btn--primary" onClick={() => ordenar(p)} disabled={ordenando === p.id || tieneProductoInactivo}>
                        {ordenando === p.id ? '…' : 'Ordenar'}
                      </button>
                    )}
                    <button className={`apl-btn ${p.activo ? 'apl-btn--warning' : 'apl-btn--ghost'}`} onClick={() => p.activo ? setConfirmToggle(p) : toggleActivo(p)}>
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    {!p.activo && (
                      <button className="apl-btn apl-btn--danger" onClick={() => setConfirmDelete(p)}>Eliminar</button>
                    )}
                  </div>
                </div>
              );})
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="apl-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setModal(false); }}}>
          <div className="apl-modal">
            <div className="apl-modal-header">
              <h3>{editando ? 'Editar plato' : 'Nuevo plato'}</h3>
              <button className="apl-modal-close" onClick={() => setModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="apl-form">
              <div className="apl-form-grid">
                <div className="apl-field">
                  <label>Nombre</label>
                  <input className="apl-input" name="nombre" value={form.nombre} onChange={handleChange} required />
                </div>
                <div className="apl-field">
                  <label>Precio</label>
                  <input className="apl-input" name="precio" type="number" step="0.01" value={form.precio} onChange={handleChange} required />
                </div>
                <div className="apl-field">
                  <label>Categoría</label>
                  <CategoriaInput
                    categorias={categorias}
                    value={form.categoria_id}
                    onChange={v => setForm(prev => ({ ...prev, categoria_id: v }))}
                    apiUrl="/api/categorias-plato/"
                    onCatsChange={() => {
                      api('/api/categorias-plato/').then(setCategorias).catch(() => {});
                    }}
                  />
                </div>
                <div className="apl-field apl-field--checkbox">
                  <label><input type="checkbox" checked={form.activo} onChange={e => setForm(prev => ({ ...prev, activo: e.target.checked }))} /> Plato activo</label>
                </div>
                <div className="apl-field apl-field--full">
                  <label>Descripción</label>
                  <textarea className="apl-input" name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} />
                </div>
                <div className="apl-field apl-field--full">
                  <label>Imagen</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="apl-input" name="imagen" value={form.imagen} onChange={handleChange} placeholder="https://ejemplo.com/imagen.jpg" style={{ flex: 1 }} />
                    <label className="apl-btn apl-btn--ghost" style={{ cursor: 'pointer', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {subiendoImg ? 'Subiendo...' : 'Subir'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => { if (e.target.files[0]) uploadImagen(e.target.files[0]); e.target.value = ''; }}
                      />
                    </label>
                  </div>
                  {form.imagen && (
                    <div style={{ marginTop: 8 }}>
                      <img src={form.imagen} alt="preview" style={{ maxWidth: 160, maxHeight: 100, borderRadius: 8, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    </div>
                  )}
                </div>
              </div>

              <div className="apl-recetas-section">
                <div className="apl-recetas-header">
                  <strong>Receta (productos necesarios)</strong>
                  <button type="button" className="apl-btn apl-btn--ghost apl-btn--sm" onClick={addReceta}>+ Agregar producto</button>
                </div>
                {form.recetas.length === 0 && <p className="apl-recetas-empty">Sin productos. Agrega los ingredientes del plato.</p>}
                {form.recetas.map((r, i) => {
                  const prod = productos.find(p => String(p.id) === String(r.producto_id));
                  const subtotal = prod?.precio_compra && r.cantidad ? Number(prod.precio_compra) * Number(r.cantidad) : null;
                  return (
                    <div key={i} className="apl-receta-row">
                      <select className="apl-input" value={r.producto_id} onChange={e => updateReceta(i, 'producto_id', e.target.value)} required>
                        <option value="">Seleccionar producto</option>
                        {productos.filter(p => p.activo).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.stock} {p.unidad}){p.precio_compra ? ` — $${Number(p.precio_compra).toFixed(2)}/${p.unidad}` : ''}
                          </option>
                        ))}
                      </select>
                      <input className="apl-input apl-input--sm" type="number" step="0.01" placeholder="Cantidad" value={r.cantidad} onChange={e => updateReceta(i, 'cantidad', e.target.value)} required />
                      {subtotal != null && <span className="apl-receta-subtotal">${subtotal.toFixed(2)}</span>}
                      <button type="button" className="apl-btn apl-btn--danger apl-btn--sm" onClick={() => removeReceta(i)}>X</button>
                    </div>
                  );
                })}
              </div>

              {recetaError && <p className="apl-error">{recetaError}</p>}
              {error && <p className="apl-error">{error}</p>}

              <div className="apl-modal-footer">
                <button type="button" className="apl-btn apl-btn--ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="apl-btn apl-btn--primary">{editando ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar plato"
        message={confirmDelete ? `¿Estás seguro de eliminar ${confirmDelete.nombre}? Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar"
        confirmClass="ap-btn--danger"
        onConfirm={() => eliminar(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={!!confirmToggle}
        title="Desactivar plato"
        message={confirmToggle ? `¿Estás seguro de desactivar ${confirmToggle.nombre}?` : ''}
        confirmText="Desactivar"
        confirmClass="ap-btn--warning"
        onConfirm={() => { toggleActivo(confirmToggle); setConfirmToggle(null); }}
        onCancel={() => setConfirmToggle(null)}
      />

      {cartaModal && (
        <div className="apl-modal-overlay apl-carta-overlay" onClick={e => { if (e.target === e.currentTarget) setCartaModal(false); }}>
          <div className="apl-carta">
            <div className="apl-carta-header">
              <button className="apl-btn apl-btn--primary" onClick={() => window.print()}>
                Imprimir
              </button>
              <button className="apl-modal-close" onClick={() => setCartaModal(false)}>&times;</button>
            </div>

            <div className="apl-carta-contenido">
              <div className="apl-carta-portada">
                <div className="apl-carta-logo">🍴</div>
                <h1 className="apl-carta-titulo">La Casa Grande</h1>
                <p className="apl-carta-lema">Tradición y sabor en cada plato</p>
              </div>

              <div className="apl-carta-divisor"></div>

              {platos.filter(p => p.activo).length === 0 ? (
                <p className="apl-carta-vacia">No hay platos activos para mostrar.</p>
              ) : (
                categorias.filter(c => platos.some(p => p.activo && p.categoria?.id === c.id)).map(cat => {
                  const platosCat = platos.filter(p => p.activo && p.categoria?.id === cat.id);
                  if (platosCat.length === 0) return null;
                  return (
                    <div key={cat.id} className="apl-carta-seccion">
                      <h2 className="apl-carta-seccion-titulo">{cat.nombre}</h2>
                      <div className="apl-carta-seccion-linea"></div>
                      {platosCat.map(p => (
                        <div key={p.id} className="apl-carta-item">
                          <div className="apl-carta-item-header">
                            <span className="apl-carta-item-nombre">{p.nombre}</span>
                            <span className="apl-carta-item-precio">${Number(p.precio).toFixed(2)}</span>
                          </div>
                          {p.descripcion && (
                            <p className="apl-carta-item-desc">{p.descripcion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}

              {platos.filter(p => !p.categoria && p.activo).length > 0 && (
                <div className="apl-carta-seccion">
                  <h2 className="apl-carta-seccion-titulo">Otros</h2>
                  <div className="apl-carta-seccion-linea"></div>
                  {platos.filter(p => !p.categoria && p.activo).map(p => (
                    <div key={p.id} className="apl-carta-item">
                      <div className="apl-carta-item-header">
                        <span className="apl-carta-item-nombre">{p.nombre}</span>
                        <span className="apl-carta-item-precio">${Number(p.precio).toFixed(2)}</span>
                      </div>
                      {p.descripcion && <p className="apl-carta-item-desc">{p.descripcion}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
