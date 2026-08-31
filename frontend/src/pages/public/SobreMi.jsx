import React from "react";
import { FiAward, FiHeart, FiStar, FiUsers } from "react-icons/fi";

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
        <div className="sobre-mi-content">
          <span className="sobre-mi-label">Nuestra historia</span>
          <h2 className="sobre-mi-title">
            Una familia que <em className="sobre-mi-title-em">cocina para familias</em>
          </h2>
          <p className="sobre-mi-text">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ad molestiae commodi sint ut aut neque, amet dolorum, quasi nemo explicabo qui quos vitae assumenda quam, placeat a! Architecto, iure quaerat!
          </p>

          <div className="sobre-mi-stats-grid">
            {statsData.map(([num, label], i) => (
              <div key={i} className="sobre-mi-stat">
                <div className="sobre-mi-stat-num">{num}</div>
                <div className="sobre-mi-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sobre-mi-visual">
          <div className="sobre-mi-visual-bg"></div>
          <div className="sobre-mi-visual-card sobre-mi-visual-card--main">
            <FiAward size={48} />
          </div>
          <div className="sobre-mi-visual-card sobre-mi-visual-card--small sobre-mi-visual-card--tl">
            <FiStar size={24} />
          </div>
          <div className="sobre-mi-visual-card sobre-mi-visual-card--small sobre-mi-visual-card--br">
            <FiHeart size={24} />
          </div>
          <div className="sobre-mi-visual-card sobre-mi-visual-card--small sobre-mi-visual-card--bl">
            <FiUsers size={24} />
          </div>
        </div>
      </div>
    </section>
  );
}
