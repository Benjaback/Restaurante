import React, { useEffect, useState } from "react";

const emojis = ["🥩", "🍝", "🐟", "🥗", "🍗", "🧀", "🥘", "🌮", "🍕", "🥪", "🫔", "🍖", "🥟", "🫘", "🥬"];

export default function Menu() {
  const [platos, setPlatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catActiva, setCatActiva] = useState(null);

  useEffect(() => {
    fetch("/api/platos/")
      .then(r => r.json())
      .then(data => {
        const activos = data.filter(p => p.activo);
        setPlatos(activos);
        const cats = [...new Set(activos.filter(p => p.categoria).map(p => p.categoria.nombre))];
        if (cats.length > 0) setCatActiva(cats[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="menu-section">
        <div className="menu-loading">Cargando carta...</div>
      </section>
    );
  }

  const categorias = [...new Set(platos.filter(p => p.categoria).map(p => p.categoria.nombre))];
  const sinCategoria = platos.filter(p => !p.categoria);
  const todasCategorias = [...categorias, ...(sinCategoria.length > 0 ? ["Otros"] : [])];
  const mostrar = catActiva === "Otros"
    ? sinCategoria
    : platos.filter(p => p.categoria?.nombre === catActiva);

  return (
    <section className="menu-section">
      <div className="menu-container">
        <div className="menu-header">
          <span className="menu-badge">🍽️ Nuestra Carta</span>
          <h2 className="menu-title">Platos que enamoran</h2>
          <p className="menu-desc">
            Todos se preparan el mismo día, con productos frescos de temporada.
          </p>
        </div>

        {platos.length === 0 ? (
          <p className="menu-empty">No hay platos disponibles en este momento.</p>
        ) : (
          <>
            <div className="menu-tabs">
              {todasCategorias.map(cat => (
                <button
                  key={cat}
                  className={`menu-tab ${catActiva === cat ? 'menu-tab--active' : ''}`}
                  onClick={() => setCatActiva(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="menu-grid">
                {mostrar.map((p, i) => {
                const emoji = emojis[(p.id + i) % emojis.length] || "🍽️";
                return (
                  <div key={p.id} className="menu-card">
                    <div className="menu-card-img">
                      {p.imagen ? (
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          className="menu-card-image"
                          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = '' }}
                        />
                      ) : null}
                      <span className="menu-card-emoji" style={{ display: p.imagen ? 'none' : '' }}>{emoji}</span>
                    </div>
                    <div className="menu-card-body">
                      <div className="menu-card-top">
                        <h3 className="menu-card-name">{p.nombre}</h3>
                        <span className="menu-card-price">${Number(p.precio).toFixed(2)}</span>
                      </div>
                      {p.descripcion && <p className="menu-card-desc">{p.descripcion}</p>}
                      {p.recetas?.length > 0 && (
                        <div className="menu-card-tags">
                          {p.recetas.map(r => (
                            <span key={r.producto_id} className="menu-tag">{r.producto_nombre}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
