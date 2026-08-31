import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

export default function AdminCaja() {
  const { empleado } = useAuth();
  const [cajas, setCajas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cajaActiva, setCajaActiva] = useState(null);

  const [abrirModal, setAbrirModal] = useState(false);
  const [montoInicial, setMontoInicial] = useState('0');

  const [cerrarModal, setCerrarModal] = useState(false);
  const [montoFinal, setMontoFinal] = useState('');

  const [historialOpen, setHistorialOpen] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => { loadCajas(); }, []);

  const loadCajas = async () => {
    setLoading(true);
    try {
      const data = await api('/api/cajas/');
      setCajas(data);
      const activa = data.find(c => c.activa);
      setCajaActiva(activa || null);
      if (activa) {
        const movs = await api(`/api/movimientos-caja/?caja_id=${activa.id}`);
        setMovimientos(movs);
      } else {
        setMovimientos([]);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const abrirCaja = async () => {
    if (!empleado?.id) {
      setError('No se encontró el empleado actual');
      return;
    }
    try {
      await api('/api/cajas/', {
        method: 'POST',
        body: JSON.stringify({ empleado_id: empleado.id, monto_inicial: parseFloat(montoInicial) || 0 }),
      });
      setAbrirModal(false);
      loadCajas();
    } catch (e) { setError(e.message); }
  };

  const cerrarCaja = async () => {
    if (!cajaActiva || !empleado?.id) return;
    try {
      await api(`/api/cajas/${cajaActiva.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ cerrar: true, empleado_cierre_id: empleado.id, monto_final: parseFloat(montoFinal) || 0 }),
      });
      setCerrarModal(false);
      loadCajas();
    } catch (e) { setError(e.message); }
  };

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  const saldoEsperado = (cajaActiva?.monto_inicial || 0) + totalIngresos - totalEgresos;

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div>
          <p className="ap-eyebrow">Caja</p>
          <h1 className="ap-title">Gestión de caja</h1>
          <p className="ap-subtitle">Apertura, cierre y control de ingresos del día.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn--ghost" onClick={() => setHistorialOpen(true)}>
            Historial
          </button>
          {cajaActiva ? (
            <button className="ap-btn ap-btn--warning" onClick={() => {
              setMontoFinal(saldoEsperado.toFixed(2));
              setCerrarModal(true);
            }}>
              Cerrar caja
            </button>
          ) : (
            <button className="ap-btn ap-btn--primary" onClick={() => setAbrirModal(true)}>
              Abrir caja
            </button>
          )}
        </div>
      </header>

      {error && <div className="ap-error-bar">{error}</div>}

      {loading ? <div className="ap-loading">Cargando…</div> : (
        <>
          {!cajaActiva && !loading && (
            <div className="ap-panel" style={{ textAlign: 'center', padding: 48 }}>
              <p className="ap-text--muted" style={{ fontSize: 18, marginBottom: 16 }}>No hay caja abierta</p>
              <p>Para registrar operaciones, abrí una caja para el turno actual.</p>
            </div>
          )}

          {cajaActiva && (
            <>
              <div className="ap-stats">
                <div className="ap-stat-card">
                  <span className="ap-stat-label">Monto inicial</span>
                  <span className="ap-stat-value">${cajaActiva.monto_inicial.toFixed(2)}</span>
                </div>
                <div className="ap-stat-card">
                  <span className="ap-stat-label">Ingresos</span>
                  <span className="ap-stat-value ap-stat-value--success">${totalIngresos.toFixed(2)}</span>
                </div>
                <div className="ap-stat-card">
                  <span className="ap-stat-label">Egresos</span>
                  <span className="ap-stat-value ap-stat-value--danger">${totalEgresos.toFixed(2)}</span>
                </div>
                <div className="ap-stat-card">
                  <span className="ap-stat-label">Saldo esperado</span>
                  <span className="ap-stat-value">${saldoEsperado.toFixed(2)}</span>
                </div>
              </div>

              <div className="ap-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Movimientos del día</h3>
                  <span className="ap-text--muted">
                    Abierta por {cajaActiva.empleado_apertura} — {new Date(cajaActiva.fecha_apertura).toLocaleString()}
                  </span>
                </div>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Referencia</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.length === 0 ? (
                        <tr><td colSpan={5} className="ap-empty">Sin movimientos.</td></tr>
                      ) : (
                        movimientos.map(m => (
                          <tr key={m.id}>
                            <td>{new Date(m.fecha).toLocaleTimeString()}</td>
                            <td>
                              <span className={`ap-badge ${m.tipo === 'ingreso' ? 'ap-badge--ok' : 'ap-badge--no'}`}>
                                {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                              </span>
                            </td>
                            <td className={m.tipo === 'ingreso' ? 'ap-stat-value--success' : 'ap-stat-value--danger'}>
                              ${m.monto.toFixed(2)}
                            </td>
                            <td>{m.referencia || '—'}</td>
                            <td className="ap-text--muted">{m.descripcion || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Modal Abrir Caja */}
      {abrirModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setAbrirModal(false); }}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Abrir caja</h3>
              <button className="ap-modal-close" onClick={() => setAbrirModal(false)}>&times;</button>
            </div>
            <div className="ap-form" style={{ padding: '0 24px' }}>
              <div className="ap-field">
                <label>Empleado</label>
                <input className="ap-input" value={empleado?.nombre || ''} disabled />
              </div>
              <div className="ap-field">
                <label>Monto inicial</label>
                <input className="ap-input" type="number" step="0.01" value={montoInicial} onChange={e => setMontoInicial(e.target.value)} />
              </div>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setAbrirModal(false)}>Cancelar</button>
              <button className="ap-btn ap-btn--primary" onClick={abrirCaja}>Abrir caja</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Caja */}
      {cerrarModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCerrarModal(false); }}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Cerrar caja</h3>
              <button className="ap-modal-close" onClick={() => setCerrarModal(false)}>&times;</button>
            </div>
            <div className="ap-form" style={{ padding: '0 24px' }}>
              <p className="ap-text--muted">Ingresos: ${totalIngresos.toFixed(2)} | Egresos: ${totalEgresos.toFixed(2)}</p>
              <p>Saldo esperado: <strong>${saldoEsperado.toFixed(2)}</strong></p>
              <div className="ap-field">
                <label>Monto final (en caja)</label>
                <input className="ap-input" type="number" step="0.01" value={montoFinal} onChange={e => setMontoFinal(e.target.value)} />
              </div>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setCerrarModal(false)}>Cancelar</button>
              <button className="ap-btn ap-btn--warning" onClick={cerrarCaja}>Cerrar caja</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {historialOpen && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setHistorialOpen(false); }}>
          <div className="ap-modal ap-modal--wide">
            <div className="ap-modal-header">
              <h3>Historial de cajas</h3>
              <button className="ap-modal-close" onClick={() => setHistorialOpen(false)}>&times;</button>
            </div>
            <div className="ap-table-wrap" style={{ margin: '0 24px 24px' }}>
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Apertura</th>
                    <th>Cierre</th>
                    <th>Empleado</th>
                    <th>Inicial</th>
                    <th>Final</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cajas.length === 0 ? (
                      <tr><td colSpan={6} className="ap-empty">Sin registros.</td></tr>
                  ) : (
                    cajas.map(c => (
                      <tr key={c.id}>
                        <td>{new Date(c.fecha_apertura).toLocaleString()}</td>
                        <td>{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString() : '—'}</td>
                        <td>{c.empleado_apertura}</td>
                        <td>${c.monto_inicial.toFixed(2)}</td>
                        <td>{c.monto_final !== null ? `$${c.monto_final.toFixed(2)}` : '—'}</td>
                        <td><span className={`ap-badge ${c.activa ? 'ap-badge--info' : 'ap-badge--muted'}`}>{c.activa ? 'Abierta' : 'Cerrada'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setHistorialOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ap-modal--wide {
          max-width: 800px;
        }
      `}</style>
    </div>
  );
}
