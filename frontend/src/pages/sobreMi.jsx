import React from "react";
import "./sobreMi.css";

const statsData = [
  ["32", "Años de historia"],
  ["3", "Generaciones"],
  ["+50k", "Clientes"],
  ["100%", "Hecho en casa"],
];

export default function SobreMi() {
  return (
    <section className="sobre-mi-section">
      <div className="sobre-mi-container">
        {/* CONTENIDO */}
        <div className="sobre-mi-content">
          <h2 className="sobre-mi-title">
            Una familia que<br />
            <em className="sobre-mi-title-em">cocina para familias</em>
          </h2>
          <p className="sobre-mi-text">
            Somos los Rodríguez. Abrimos nuestras puertas en 1992 con una sola mesa y muchas ganas. 
            Hoy, tres generaciones después, seguimos cocinando con los mismos valores: ingredientes frescos, 
            recetas de siempre y el calor de un hogar.
          </p>

          {/* ESTADÍSTICAS */}
          <div className="sobre-mi-stats-grid">
            {statsData.map(([num, label], i) => (
              <div key={i} className="sobre-mi-stat">
                <div className="sobre-mi-stat-num">{num}</div>
                <div className="sobre-mi-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* VISUAL */}
        <div className="sobre-mi-visual">
          <div className="sobre-mi-photo-large">👨‍🍳</div>
          <div className="sobre-mi-photo-small">🌿</div>
          <div className="sobre-mi-photo-small">🏡</div>
        </div>
      </div>
    </section>
  );
}