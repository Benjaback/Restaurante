import React from "react";
import "./inicio.css";

export default function Inicio() {
  return (
    <div className="inicio-hero">
      {/* HERO CARD */}
      <div className="inicio-card">
        <h1 className="inicio-title">Come Bien 🍴</h1>
        <p className="inicio-subtitle">Restaurante familiar con tradición y sabor</p>
        <div className="inicio-actions">
          <button className="btn-primary">Ver Menú</button>
          <button className="btn-secondary">Reservar</button>
        </div>
      </div>
    </div>
  );
}