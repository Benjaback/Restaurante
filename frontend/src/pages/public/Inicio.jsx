import React from "react";
import { FiBookOpen, FiCalendar, FiArrowDown, FiStar } from "react-icons/fi";
import heroBg from "../../assets/img/hero-bg.jpg";

export default function Inicio() {
  const scrollTo = (section) => {
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="inicio-hero">
      <div className="inicio-bg" style={{ backgroundImage: `url(${heroBg})` }}></div>
      <div className="inicio-overlay"></div>
      <div className="inicio-pattern"></div>

      <div className="inicio-content">
        <div className="inicio-badge">
          <FiStar size={14} />
          <span>Desde 1998</span>
        </div>

        <div className="inicio-icon-wrapper">
          <FiBookOpen size={32} />
        </div>

        <h1 className="inicio-title">La Casa Grande</h1>

        <div className="inicio-divider">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <p className="inicio-subtitle">
          Tradición que se sirve en cada plato.
          <br />
          Cocina casera con productos frescos de temporada.
        </p>

        <div className="inicio-actions">
          <button className="inicio-btn inicio-btn--primary" onClick={() => scrollTo("clases")}>
            <FiBookOpen size={16} />
            Ver Menú
          </button>
          <button className="inicio-btn inicio-btn--secondary" onClick={() => scrollTo("sobre-mi")}>
            <FiCalendar size={16} />
            Reservar Mesa
          </button>
        </div>
      </div>

      <div className="inicio-scroll">
        <FiArrowDown size={20} />
      </div>
    </section>
  );
}
