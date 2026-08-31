import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';

// Páginas Admin
import AdminLayout from './layouts/AdminLayout';

// Login / Register
import Login from './pages/public/Login';
import Register from './pages/public/Register';

function AdminRoute({ children }) {
  const token = localStorage.getItem('auth_token');
  const authData = JSON.parse(localStorage.getItem('auth_data') || '{}');
  const user = authData.user;
  const empleado = authData.empleado;
  if (!token) return <Navigate to="/login" />;
  if (!empleado && !user?.is_staff && !user?.is_superuser) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <div className="app">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Rutas públicas con navbar principal */}
            <Route path="/" element={<PublicLayout />} />

            {/* Login / Register */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Rutas Admin protegidas */}
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
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
