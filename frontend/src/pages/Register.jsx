import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './login.css';

const TURNOS = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
];

const Register = () => {
  const { user, saveSession } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nombre, setNombre] = useState('');
  const [rolId, setRolId] = useState('');
  const [turno, setTurno] = useState('manana');
  const [telefono, setTelefono] = useState('');
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/roles/')
      .then((r) => r.json())
      .then((data) => setRoles(data.filter((r) => r.activo)))
      .catch(() => setError('Error al cargar roles'));
  }, []);

  if (user) return <Navigate to="/admin/home" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, nombre, rol_id: parseInt(rolId, 10), turno, telefono }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');
      saveSession(data.token, data.user, data.empleado);
      navigate('/admin/home');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🍴</div>
          <h1>Crear cuenta</h1>
          <p className="login-subtitle">Regístrate como empleado</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label htmlFor="username">Usuario</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tu nombre de usuario" autoFocus required />
          </div>

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
          </div>

          <div className="login-field">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del empleado" required />
          </div>

          <div className="login-field">
            <label htmlFor="rol">Rol</label>
            <select id="rol" value={rolId} onChange={(e) => setRolId(e.target.value)} required>
              <option value="">Selecciona un rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>

          <div className="login-field">
            <label htmlFor="turno">Turno</label>
            <select id="turno" value={turno} onChange={(e) => setTurno(e.target.value)}>
              {TURNOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="login-field">
            <label htmlFor="telefono">Teléfono</label>
            <input id="telefono" type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
          </div>

          <div className="login-field">
            <label htmlFor="confirm">Confirmar contraseña</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña" required />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="login-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
