import React, { useEffect, useState, useCallback, useRef } from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import api from '../../../services/api';

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
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

export default function AdminElaboracion() {
  const [recetasData, setRecetasData] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroStock, setFiltroStock] = useState('');

  const [elaborarModal, setElaborarModal] = useState(null);
  const [elaborarCantidad, setElaborarCantidad] = useState(1);
  const [confirmDesactivar, setConfirmDesactivar] = useState(null);

  const [recetaModal, setRecetaModal] = useState(false);
  const [recetaEditando, setRecetaEditando] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [insumosTemp, setInsumosTemp] = useState([]);


  const rowVacia = () => ({ producto_insumo: '', cantidad: '' });

  useEffect(() => { load(); loadProductos(); }, []);

  const load = async () => {
    setLoading(true);
    try { setRecetasData(await api('/api/recetas-producto/')); } catch {};
    setLoading(false);
  };
  const loadProductos = async () => {
    try { setProductos(await api('/api/productos/')); } catch {};
  };

  const confirmarElaborar = async () => {
    try {
      await api('/api/producciones/', {
        method: 'POST',
        body: JSON.stringify({ producto_id: elaborarModal.producto_id, cantidad: parseFloat(elaborarCantidad) }),
      });
      setElaborarModal(null);
      setElaborarCantidad(1);
      load();
    } catch (e) { setError(e.message); }
  };

  const abrirReceta = async (p) => {
    setRecetaEditando(p);
    setNuevoNombre('');
    if (p) {
      try {
        const data = await api('/api/recetas-producto/');
        const grupo = data.find(r => r.producto_id === p.id);
        setInsumosTemp(grupo ? grupo.receta.map(r => ({ producto_insumo: r.producto_insumo, cantidad: r.cantidad })) : []);
      } catch { setInsumosTemp([]); }
    } else {
      setInsumosTemp([]);
    }
    setRecetaModal(true);
  };

  const cerrarReceta = () => {
    setRecetaModal(false);
    setRecetaEditando(null);
    setNuevoNombre('');
    setInsumosTemp([]);
  };

  const agregarFila = () => setInsumosTemp(prev => [...prev, rowVacia()]);

  const cambiarInsumo = (idx, val) => setInsumosTemp(prev => { const c = [...prev]; c[idx].producto_insumo = val; return c; });

  const cambiarCantidad = (idx, val) => setInsumosTemp(prev => { const c = [...prev]; c[idx].cantidad = val; return c; });

  const quitarFila = (idx) => setInsumosTemp(prev => prev.filter((_, i) => i !== idx));

  const guardarReceta = async () => {
    const valids = insumosTemp.filter(r => r.producto_insumo && r.cantidad);
    if (valids.length === 0) { setError('Agregá al menos un insumo'); return; }

    let productoId = recetaEditando?.id;

    if (!productoId && nuevoNombre.trim()) {
      try {
        const creado = await api('/api/productos/', { method: 'POST', body: JSON.stringify({ nombre: nuevoNombre.trim() }) });
        productoId = creado.id;
        await loadProductos();
      } catch (e) { setError(e.message); return; }
    }

    if (!productoId) { setError('Seleccioná un producto o escribí un nombre nuevo'); return; }

    try {
      const existing = await api('/api/recetas-producto/');
      const grupo = existing.find(r => r.producto_id === productoId);
      if (grupo) {
        for (const ins of grupo.receta) {
          await api(`/api/recetas-producto/${ins.id}/`, { method: 'DELETE' });
        }
      }

      await api('/api/recetas-producto/', {
        method: 'POST',
        body: JSON.stringify({
          producto_elaborado: productoId,
          insumos: valids.map(r => ({ producto_insumo: parseInt(r.producto_insumo, 10), cantidad: parseFloat(r.cantidad) })),
        }),
      });

      cerrarReceta();
      load();
      loadProductos();
    } catch (e) { setError(e.message); }
  };

  const filtered = recetasData.filter(r => {
    const prod = productos.find(p => p.id === r.producto_id);
    if (busqueda && !r.producto_nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (filtroEstado === 'activo' && !prod?.activo) return false;
    if (filtroEstado === 'inactivo' && prod?.activo !== false) return false;
    if (filtroStock === 'bajo' && !(prod && prod.stock <= prod.stock_minimo)) return false;
    if (filtroStock === 'agotado' && !(prod && prod.stock <= 0)) return false;
    return true;
  });

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div>
          <p className="ap-eyebrow">Producción</p>
          <h1 className="ap-title">Elaboración</h1>
          <p className="ap-subtitle">Definí recetas de productos y fabricalos a partir de insumos.</p>
        </div>
        <button className="ap-btn ap-btn--primary" onClick={() => abrirReceta(null)}>Nueva receta</button>
      </header>

      {error && <div className="ap-error-bar">{error}</div>}

      <div className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-search-wrap">
            <svg className="ap-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input className="ap-input ap-search" type="text" placeholder="Buscar producto elaborado..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="ap-filter-group">
            <div className="ap-filter-icon-wrap">
              <IconFilter />
            </div>
            <FilterDropdown
              label="Estado"
              placeholder="Todos"
              value={filtroEstado}
              onChange={v => setFiltroEstado(v)}
              options={[
                { value: 'activo', label: 'Solo activos' },
                { value: 'inactivo', label: 'Solo inactivos' },
              ]}
            />
            <FilterDropdown
              label="Stock"
              placeholder="Todos"
              value={filtroStock}
              onChange={v => setFiltroStock(v)}
              options={[
                { value: 'bajo', label: 'Stock bajo' },
                { value: 'agotado', label: 'Agotado' },
              ]}
            />
            {(filtroEstado || filtroStock) && (
              <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => { setFiltroEstado(''); setFiltroStock(''); }}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {loading ? <div className="ap-loading">Cargando…</div> : recetasData.length === 0 ? (
          <div className="ap-empty ael-empty-state">
            No hay recetas de elaboración. Hacé clic en "Nueva receta" para crear una.
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Producto elaborado</th>
                  <th>Stock actual</th>
                  <th>Ingredientes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="ap-empty">Sin resultados.</td></tr>
                ) : (
                  filtered.map(r => {
                    const prod = productos.find(p => p.id === r.producto_id);
                    return (
                      <tr key={r.producto_id}>
                        <td className="ap-td--bold">{r.producto_nombre}</td>
                        <td>{r.producto_stock} {r.producto_unidad}</td>
                        <td className="ael-ingredientes-cell">
                          {r.receta.map(ins => `${ins.cantidad} ${ins.producto_insumo_unidad} de ${ins.producto_insumo_nombre}`).join(', ')}
                        </td>
                        <td>
                          <div className="ap-actions ael-actions">
                            <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => abrirReceta(prod)}>Editar</button>
                            <button className="ap-btn ap-btn--primary ap-btn--sm" onClick={() => { setElaborarModal(r); setElaborarCantidad(1); }}>Elaborar</button>
                            <button className="ap-btn ap-btn--warning ap-btn--sm" onClick={() => setConfirmDesactivar(r)}>Desactivar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {recetaModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrarReceta(); }}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>{recetaEditando ? `Receta de ${recetaEditando.nombre}` : 'Nueva receta'}</h3>
              <button className="ap-modal-close" onClick={cerrarReceta}>&times;</button>
            </div>

            {!recetaEditando && (
              <div className="ael-nuevo-producto">
                <label>Nombre del nuevo producto</label>
                <input className="ap-input ael-input-full" type="text" placeholder="Ej: Masa para pizza, Salsa de tomate..." value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
              </div>
            )}

            <div className="ael-receta-section">
              <div className="ael-receta-header">
                <strong>Insumos necesarios</strong>
                <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={agregarFila}>+ Agregar insumo</button>
              </div>
              {insumosTemp.length === 0 && <p className="ael-receta-empty">Sin insumos. Agregá los ingredientes del producto.</p>}
              {insumosTemp.map((row, i) => (
                <div key={i} className="ael-receta-row">
                  <select className="ap-input" value={row.producto_insumo} onChange={e => cambiarInsumo(i, e.target.value)}>
                    <option value="">Seleccionar insumo</option>
                    {productos.filter(p => !recetaEditando || p.id !== recetaEditando.id).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.stock} {p.unidad})</option>
                    ))}
                  </select>
                  <input className="ap-input ap-input--sm" type="number" step="0.01" min="0" placeholder="Cantidad" value={row.cantidad} onChange={e => cambiarCantidad(i, e.target.value)} />
                  {row.producto_insumo && <span className="ael-unidad-label">{productos.find(p => String(p.id) === row.producto_insumo)?.unidad || ''}</span>}
                  <button type="button" className="ap-btn ap-btn--danger ap-btn--xs" onClick={() => quitarFila(i)}>X</button>
                </div>
              ))}
            </div>

            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={cerrarReceta}>Cancelar</button>
              <button className="ap-btn ap-btn--primary" onClick={guardarReceta}>Guardar receta</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDesactivar}
        title="Desactivar receta"
        message={confirmDesactivar ? `¿Estás seguro de desactivar la receta de ${confirmDesactivar.producto_nombre}? Se eliminarán todos sus ingredientes.` : ''}
        confirmText="Desactivar"
        confirmClass="ap-btn--warning"
        onConfirm={async () => {
          try {
            for (const ins of confirmDesactivar.receta) {
              await api(`/api/recetas-producto/${ins.id}/`, { method: 'DELETE' });
            }
            setConfirmDesactivar(null);
            load();
          } catch (e) { setError(e.message); }
        }}
        onCancel={() => setConfirmDesactivar(null)}
      />

      {elaborarModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setElaborarModal(null); }}>
          <div className="ap-modal ap-modal--sm">
            <div className="ap-modal-header">
              <h3>Elaborar {elaborarModal.producto_nombre}</h3>
              <button className="ap-modal-close" onClick={() => setElaborarModal(null)}>&times;</button>
            </div>

            <div className="ael-elaborar-body">
              <p className="ael-elaborar-desc">Se descontarán los siguientes insumos:</p>
              <ul className="ael-elaborar-lista">
                {elaborarModal.receta.map((ins, i) => (
                  <li key={i}>
                    {ins.cantidad} {ins.producto_insumo_unidad} de <strong>{ins.producto_insumo_nombre}</strong>
                    <span className={`ael-stock-badge ${ins.producto_insumo_stock > 0 ? '' : 'ael-stock-badge--empty'}`}>
                      (stock: {ins.producto_insumo_stock})
                    </span>
                  </li>
                ))}
              </ul>

              <label className="ael-cantidad-label">
                Cantidad a producir
              </label>
              <input className="ap-input ael-cantidad-input" type="number" step="1" min="1" value={elaborarCantidad} onChange={e => setElaborarCantidad(e.target.value)} />
            </div>

            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setElaborarModal(null)}>Cancelar</button>
              <button className="ap-btn ap-btn--primary" onClick={confirmarElaborar}>Elaborar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
