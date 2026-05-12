import React, { useState } from "react";
import "./menu.css";

const platosData = [
  { emoji: "🥩", cat: "Carnes", name: "Asado de Tira", desc: "A la brasa, jugoso y tierno" },
  { emoji: "🍝", cat: "Pastas", name: "Lasaña casera", desc: "Con ragú casero y béchamel" },
  { emoji: "🐟", cat: "Pescados", name: "Salmón a la manteca", desc: "Con limón y hierbas frescas" },
  { emoji: "🥗", cat: "Ensaladas", name: "Ensalada mixta", desc: "Fresca con aderezo de la casa" },
  { emoji: "🍗", cat: "Aves", name: "Pollo al horno", desc: "Crujiente por fuera, jugoso adentro" },
  { emoji: "🧀", cat: "Tabla", name: "Tabla de quesos", desc: "Surtido de quesos artesanales" },
];

export default function Menu() {
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <section className="menu-section">
      <div className="menu-container">
        {/* HEADER */}
        <div className="section-label">🍽️ Nuestra Carta</div>
        <h2 className="section-title">Platos que enamoran</h2>
        <p className="section-sub">
          Todos se preparan el mismo día, con productos frescos de temporada.
        </p>

        {/* GRID DE PLATOS */}
        <div className="menu-grid">
          {platosData.map((plato, i) => (
            <div
              key={i}
              className="menu-card"
              style={{
                transform: hoveredCard === i ? "translateY(-6px)" : "none",
                boxShadow: hoveredCard === i ? "0 12px 24px rgba(59, 32, 8, 0.15)" : "0 0 0 rgba(0,0,0,0)",
              }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="menu-card-emoji">{plato.emoji}</div>
              <div className="menu-card-category">{plato.cat}</div>
              <div className="menu-card-name">{plato.name}</div>
              <div className="menu-card-desc">{plato.desc}</div>
            </div>
          ))}
        </div>

        {/* FOOTER CON CTA */}
        <div className="menu-footer">
          <div>
            <div className="menu-footer-text">Menú completo</div>
            <div className="menu-footer-value">$4.200</div>
          </div>
          <button className="menu-button">📥 Descargar menú →</button>
        </div>
      </div>
    </section>
  );
}