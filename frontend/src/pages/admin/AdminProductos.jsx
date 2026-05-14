import React, { useEffect, useState } from 'react';
import './admin-productos.css';

const FORM_VACIO = { nombre: '', categoria_id: '', stock: 0, unidad: 'unidad', stock_minimo: 0, activo: true };

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

  useEffect(() => { load(); loadCats(); }, []);

  const api = (url, opts) => fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }));

  const load = async () => {
    setLoading(true);
    try { setProductos(await api('/api/productos/')); } catch { setError('Error al cargar productos'); }
    setLoading(false);
  };
  const loadCats = async () => { try { setCategorias(await api('/api/categorias-producto/')); } catch {} };

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
    if (p) { setEditando(p); setForm({ nombre: p.nombre, categoria_id: p.categoria?.id || '', stock: p.stock, unidad: p.unidad, stock_minimo: p.stock_minimo, activo: p.activo }); }
    else { setEditando(null); setForm(FORM_VACIO); }
    setModal(true);
  };

  const toggleActivo = async (p) => {
    try { await api(`/api/productos/${p.id}/`, { method: 'PATCH', body: JSON.stringify({ activo: !p.activo }) }); load(); }
    catch { setError('Error al actualizar'); }
  };

  const lowStock = (p) => p.activo && p.stock <= p.stock_minimo;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

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
        <div className="ap-stat-card"><span className="ap-stat-label">Total</span><span className="ap-stat-value">{productos.length}</span></div>
        <div className="ap-stat-card"><span className="ap-stat-label">Stock bajo</span><span className="ap-stat-value ap-stat-value--danger">{productos.filter(lowStock).length}</span></div>
        <div className="ap-stat-card"><span className="ap-stat-label">Inactivos</span><span className="ap-stat-value ap-stat-value--muted">{productos.filter(p => !p.activo).length}</span></div>
      </div>

      <div className="ap-panel">
        {loading ? <div className="ap-loading">Cargando…</div> : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Stock mínimo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr><td colSpan={6} className="ap-empty">No hay productos.</td></tr>
                ) : (
                  productos.map(p => (
                    <tr key={p.id} className={lowStock(p) ? 'ap-row--warning' : ''}>
                      <td className="ap-td--bold">{p.nombre}</td>
                      <td>{p.categoria?.nombre || '—'}</td>
                      <td className={lowStock(p) ? 'ap-text--danger' : ''}>{p.stock} {p.unidad}</td>
                      <td className="ap-text--muted">{p.stock_minimo} {p.unidad}</td>
                      <td><span className={`ap-badge ${p.activo ? 'ap-badge--ok' : 'ap-badge--no'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="ap-actions">
                          <button className="ap-btn ap-btn--ghost" onClick={() => openModal(p)}>Editar</button>
                          <button className={`ap-btn ap-btn--sm ${p.activo ? 'ap-btn--danger' : 'ap-btn--success'}`} onClick={() => toggleActivo(p)}>{p.activo ? 'Desactivar' : 'Activar'}</button>
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
    </div>
  );
}
