import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Páginas Públicas
import Inicio from './pages/inicio';
import SobreMi from './pages/sobreMi';
import Clases from './pages/menu';
import Navbar from './components/navbar';

// Páginas Admin
import AdminLayout from './pages/admin/AdminLayout';

// Login / Register
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <div className="app">
      <AuthProvider>
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

            {/* Login / Register */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Rutas Admin protegidas */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            />

            {/* Redirect por defecto */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
