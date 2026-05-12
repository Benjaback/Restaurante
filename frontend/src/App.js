import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Páginas Públicas
import Inicio from './pages/inicio';
import SobreMi from './pages/sobreMi';
import Clases from './pages/menu';
import Navbar from './components/navbar';

// Páginas Admin
import AdminLayout from './pages/admin/AdminLayout';

function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          {/* Rutas públicas con navbar principal */}
          <Route
            path="/"
            element={
              <>
                <Navbar />
                <main>
                  <section className="page-section" id="inicio">
                    <Inicio />
                  </section>
                  <section className="page-section" id="clases">
                    <Clases />
                  </section>
                  <section className="page-section" id="sobre-mi">
                    <SobreMi />
                  </section>
                </main>
              </>
            }
          />

          {/* Rutas Admin con layout separado */}
          <Route path="/admin/*" element={<AdminLayout />} />

          {/* Redirect por defecto */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
