import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'auth_token';
const AUTH_KEY = 'auth_data';

const loadAuth = () => {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : { user: null, empleado: null };
  } catch {
    return { user: null, empleado: null };
  }
};

export const AuthProvider = ({ children }) => {
  const initial = loadAuth();
  const [user, setUser] = useState(initial.user);
  const [empleado, setEmpleado] = useState(initial.empleado);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const saveSession = (token, user, empleado) => {
    setToken(token);
    setUser(user);
    setEmpleado(empleado);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, empleado }));
  };

  const clearSession = () => {
    setToken(null);
    setUser(null);
    setEmpleado(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
  };

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    saveSession(data.token, data.user, data.empleado);
    return data;
  };

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout/', {
          method: 'POST',
          headers: { Authorization: `Token ${token}` },
        });
      } catch {}
    }
    clearSession();
  }, [token]);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me/', {
          headers: { Authorization: `Token ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const u = { id: data.id, username: data.username, email: data.email, is_staff: data.is_staff, is_superuser: data.is_superuser };
          const e = data.empleado || null;
          setUser(u);
          setEmpleado(e);
          localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, empleado: e }));
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      }
      setLoading(false);
    };
    verify();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, empleado, token, loading, login, logout, saveSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
