import React, { useEffect, useState } from 'react';
import './admin-platos.css';

function CategoriaInput({ categorias, value, onChange, apiUrl, onCatsChange }) {
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState('');

  const crearCategoria = async () => {
    if (!nueva.trim()) return;
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nueva.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', precio: 0, categoria_id: '', descripcion: '', activo: true, recetas: [] });
  const [ordenando, setOrdenando] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const api = (url, opts) => fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }));

  const loadAll = async () => {
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
  };

  const openModal = (plato) => {
    if (plato) {
      setEditando(plato);
      setForm({
        nombre: plato.nombre,
        precio: plato.precio,
        categoria_id: plato.categoria?.id || '',
        descripcion: plato.descripcion,
        activo: plato.activo,
        recetas: plato.recetas.map(r => ({ producto_id: r.producto_id, cantidad: r.cantidad })),
      });
    } else {
      setEditando(null);
      setForm({ nombre: '', precio: 0, categoria_id: '', descripcion: '', activo: true, recetas: [] });
    }
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api(editando ? `/api/platos/${editando.id}/` : '/api/platos/', {
        method: editando ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null }),
      });
      setModal(false); setEditando(null); loadAll();
    } catch (e) { setError(e.message); }
  };

  const addReceta = () => {
    setForm(prev => ({ ...prev, recetas: [...prev.recetas, { producto_id: '', cantidad: 0 }] }));
  };

  const removeReceta = (idx) => {
    setForm(prev => ({ ...prev, recetas: prev.recetas.filter((_, i) => i !== idx) }));
  };

  const updateReceta = (idx, field, value) => {
    setForm(prev => {
      const recetas = [...prev.recetas];
      recetas[idx] = { ...recetas[idx], [field]: value };
      return { ...prev, recetas };
    });
  };

  const ordenar = async (plato) => {
    setOrdenando(plato.id);
    setError('');
    try {
      await api('/api/ordenar/', { method: 'POST', body: JSON.stringify({ plato_id: plato.id, cantidad: 1 }) });
      loadAll();
    } catch (e) { setError(e.message); }
    setOrdenando(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="apl-root">
      <header className="apl-header">
        <div>
          <p className="apl-eyebrow">Carta</p>
          <h1 className="apl-title">Platos</h1>
          <p className="apl-subtitle">Crea platos con sus recetas y controla el inventario.</p>
        </div>
        <button className="apl-btn apl-btn--primary" onClick={() => openModal(null)}>Agregar plato</button>
      </header>

      {error && <div className="apl-error-bar">{error}</div>}

      <div className="apl-stats">
        <div className="apl-stat-card"><span className="apl-stat-label">Total</span><span className="apl-stat-value">{platos.length}</span></div>
        <div className="apl-stat-card"><span className="apl-stat-label">Activos</span><span className="apl-stat-value apl-stat-value--green">{platos.filter(p => p.activo).length}</span></div>
      </div>

      <div className="apl-panel">
        {loading ? <div className="apl-loading">Cargando…</div> : (
          <div className="apl-grid">
            {platos.length === 0 ? (
              <div className="apl-empty">No hay platos.</div>
            ) : (
              platos.map(p => (
                <div key={p.id} className={`apl-card ${!p.activo ? 'apl-card--inactive' : ''}`}>
                  <div className="apl-card-header">
                    <h3>{p.nombre}</h3>
                    <span className={`apl-badge ${p.activo ? 'apl-badge--ok' : 'apl-badge--no'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  {p.categoria && <span className="apl-card-cat">{p.categoria.nombre}</span>}
                  <p className="apl-card-price">${p.precio.toFixed(2)}</p>
                  {p.descripcion && <p className="apl-card-desc">{p.descripcion}</p>}
                  {p.recetas.length > 0 && (
                    <div className="apl-card-recetas">
                      <strong>Receta:</strong>
                      <ul>
                        {p.recetas.map(r => (
                          <li key={r.id}>{r.cantidad} {r.producto_unidad} de {r.producto_nombre}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="apl-card-actions">
                    <button className="apl-btn apl-btn--ghost" onClick={() => openModal(p)}>Editar</button>
                    {p.activo && p.recetas.length > 0 && (
                      <button className="apl-btn apl-btn--primary" onClick={() => ordenar(p)} disabled={ordenando === p.id}>
                        {ordenando === p.id ? '…' : 'Ordenar'}
                      </button>
                    )}
                  </div>
                </div>
              ))
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
                      fetch('/api/categorias-plato/').then(r => r.json()).then(setCategorias).catch(() => {});
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
              </div>

              <div className="apl-recetas-section">
                <div className="apl-recetas-header">
                  <strong>Receta (productos necesarios)</strong>
                  <button type="button" className="apl-btn apl-btn--ghost apl-btn--sm" onClick={addReceta}>+ Agregar producto</button>
                </div>
                {form.recetas.length === 0 && <p className="apl-recetas-empty">Sin productos. Agrega los ingredientes del plato.</p>}
                {form.recetas.map((r, i) => (
                  <div key={i} className="apl-receta-row">
                    <select className="apl-input" value={r.producto_id} onChange={e => updateReceta(i, 'producto_id', e.target.value)} required>
                      <option value="">Seleccionar producto</option>
                      {productos.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.stock} {p.unidad})</option>)}
                    </select>
                    <input className="apl-input apl-input--sm" type="number" step="0.01" placeholder="Cantidad" value={r.cantidad} onChange={e => updateReceta(i, 'cantidad', e.target.value)} required />
                    <button type="button" className="apl-btn apl-btn--danger apl-btn--sm" onClick={() => removeReceta(i)}>X</button>
                  </div>
                ))}
              </div>

              {error && <p className="apl-error">{error}</p>}

              <div className="apl-modal-footer">
                <button type="button" className="apl-btn apl-btn--ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="apl-btn apl-btn--primary">{editando ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
