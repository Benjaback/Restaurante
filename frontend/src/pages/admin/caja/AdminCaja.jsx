import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

export default function AdminCaja() {
  const { user, empleado } = useAuth();
  const [movimientos, setMovimientos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cajaActiva, setCajaActiva] = useState(null);

  const [abrirModal, setAbrirModal] = useState(false);
  const [montoInicial, setMontoInicial] = useState('0');

  const [cerrarModal, setCerrarModal] = useState(false);
  const [montoFinal, setMontoFinal] = useState('');
  const [pendientes, setPendientes] = useState([]);

  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [egresoModal, setEgresoModal] = useState(false);
  const [editarEgreso, setEditarEgreso] = useState(null);
  const [egresoMonto, setEgresoMonto] = useState('');
  const [egresoRef, setEgresoRef] = useState('');
  const [egresoDesc, setEgresoDesc] = useState('');

  const [detalleCaja, setDetalleCaja] = useState(null);
  const [detalleMovimientos, setDetalleMovimientos] = useState([]);
  const [detallePagos, setDetallePagos] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

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
      const activa = data.find(c => c.activa);
      setCajaActiva(activa || null);
      if (activa) {
        const movs = await api(`/api/movimientos-caja/?caja_id=${activa.id}`);
        setMovimientos(movs);
        const pagosData = await api(`/api/pagos/?caja_id=${activa.id}`);
        setPagos(pagosData);
      } else {
        setMovimientos([]);
        setPagos([]);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const loadHistorial = async (filtros = {}) => {
    const desde = filtros.desde ?? filtroDesde;
    const hasta = filtros.hasta ?? filtroHasta;
    const estado = filtros.estado ?? filtroEstado;
    setHistorialLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      if (estado) params.set('estado', estado);
      const qs = params.toString();
      const data = await api(`/api/cajas/${qs ? `?${qs}` : ''}`);
      setHistorialCajas(data);
    } catch (e) { setError(e.message); }
    setHistorialLoading(false);
  };

  const abrirHistorial = () => {
    setHistorialOpen(true);
    loadHistorial();
  };

  const limpiarHistorial = () => {
    setFiltroDesde('');
    setFiltroHasta('');
    setFiltroEstado('');
    loadHistorial({ desde: '', hasta: '', estado: '' });
  };

  const abrirCaja = async () => {
    if (!user?.is_superuser && !empleado?.id) {
      setError('No hay empleado vinculado a tu cuenta');
      return;
    }
    try {
      const body = { monto_inicial: parseFloat(montoInicial) || 0 };
      if (empleado?.id) body.empleado_id = empleado.id;
      await api('/api/cajas/', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setAbrirModal(false);
      loadCajas();
    } catch (e) { setError(e.message); }
  };

  const cerrarCaja = async () => {
    if (!cajaActiva) return;
    if (!user?.is_superuser && !empleado?.id) {
      setError('No hay empleado vinculado a tu cuenta');
      return;
    }
    try {
      const body = { cerrar: true, monto_final: parseFloat(montoFinal) || 0 };
      if (empleado?.id) body.empleado_cierre_id = empleado.id;
      await api(`/api/cajas/${cajaActiva.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setCerrarModal(false);
      loadCajas();
    } catch (e) { setError(e.message); }
  };

  const registrarEgreso = async () => {
    if (!cajaActiva) return;
    const monto = parseFloat(egresoMonto);
    if (!monto || monto <= 0) {
      setError('Ingresá un monto válido');
      return;
    }

    if (editarEgreso) {
      try {
        await api(`/api/movimientos-caja/${editarEgreso.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            monto,
            referencia: egresoRef,
            descripcion: egresoDesc,
          }),
        });
        setEgresoModal(false);
        setEditarEgreso(null);
        setEgresoMonto('');
        setEgresoRef('');
        setEgresoDesc('');
        recargarDesdeMovimiento(editarEgreso);
      } catch (e) { setError(e.message); }
      return;
    }

    try {
      await api('/api/movimientos-caja/', {
        method: 'POST',
        body: JSON.stringify({
          caja_id: cajaActiva.id,
          tipo: 'egreso',
          monto,
          referencia: egresoRef,
          descripcion: egresoDesc,
        }),
      });
      setEgresoModal(false);
      setEgresoMonto('');
      setEgresoRef('');
      setEgresoDesc('');
      loadCajas();
    } catch (e) { setError(e.message); }
  };

  const abrirDetalle = async (caja) => {
    setDetalleCaja(caja);
    setDetalleLoading(true);
    try {
      const [movs, pg] = await Promise.all([
        api(`/api/movimientos-caja/?caja_id=${caja.id}`),
        api(`/api/pagos/?caja_id=${caja.id}`),
      ]);
      setDetalleMovimientos(movs);
      setDetallePagos(pg);
    } catch (e) { setError(e.message); }
    setDetalleLoading(false);
  };

  const recargarDesdeMovimiento = (mov) => {
    if (mov?.caja_id === cajaActiva?.id) {
      loadCajas();
    } else if (detalleCaja && mov?.caja_id === detalleCaja.id) {
      abrirDetalle(detalleCaja);
    } else {
      loadCajas();
    }
  };

  const eliminarEgreso = async (mov) => {
    if (!window.confirm('¿Eliminar este egreso?')) return;
    try {
      await api(`/api/movimientos-caja/${mov.id}/`, { method: 'DELETE' });
      recargarDesdeMovimiento(mov);
    } catch (e) { setError(e.message); }
  };

  const iniciarEditarEgreso = (mov) => {
    setEditarEgreso(mov);
    setEgresoMonto(String(mov.monto));
    setEgresoRef(mov.referencia || '');
    setEgresoDesc(mov.descripcion || '');
    setEgresoModal(true);
  };

  const reabrirCaja = async (caja) => {
    if (!window.confirm('¿Reabrir esta caja? Se cerrará cualquier otra caja activa.')) return;
    try {
      await api(`/api/cajas/${caja.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ cerrar: false }),
      });
      loadCajas();
      loadHistorial();
    } catch (e) { setError(e.message); }
  };

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  const saldoEsperado = (cajaActiva?.monto_inicial || 0) + totalIngresos - totalEgresos;

  const METODOS_PAGO = [
    { key: 'efectivo', label: 'Efectivo' },
    { key: 'tarjeta', label: 'Tarjeta' },
    { key: 'transferencia', label: 'Transferencia' },
  ];
  const totalPagos = pagos.reduce((s, p) => s + p.monto, 0);
  const desglose = METODOS_PAGO.map(m => ({
    ...m,
    total: pagos.filter(p => p.metodo === m.key).reduce((s, p) => s + p.monto, 0),
  }));
  const egresos = movimientos.filter(m => m.tipo === 'egreso');
  const montoReal = parseFloat(montoFinal) || 0;
  const diferencia = saldoEsperado - montoReal;

  const exportarReporte = (caja = cajaActiva, movs = movimientos, pagosData = pagos, montoRealValue = montoReal) => {
    const ing = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0);
    const egr = movs.filter(m => m.tipo === 'egreso');
    const totalP = pagosData.reduce((s, p) => s + Number(p.monto), 0);
    const desg = METODOS_PAGO.map(m => ({
      ...m,
      total: pagosData.filter(p => p.metodo === m.key).reduce((s, p) => s + Number(p.monto), 0),
    }));
    const saldo = (Number(caja.monto_inicial) || 0) + ing - egr.reduce((s, m) => s + Number(m.monto), 0);
    const real = Number(montoRealValue) || 0;
    const diff = saldo - real;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de cierre de caja', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Apertura: ${new Date(caja.fecha_apertura).toLocaleString()}`, 14, 36);
    doc.text(`Cierre: ${caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleString() : '—'}`, 14, 42);
    doc.text(`Empleado: ${caja.empleado_apertura}`, 14, 48);

    autoTable(doc, {
      startY: 56,
      head: [['Resumen', 'Monto']],
      body: [
        ['Monto inicial', `$${Number(caja.monto_inicial).toFixed(2)}`],
        ...desg.map(m => [m.label, `$${m.total.toFixed(2)}`]),
        ['Total ingresos (cobros)', `$${totalP.toFixed(2)}`],
        ['Total egresos', `$${egr.reduce((s, m) => s + Number(m.monto), 0).toFixed(2)}`],
        ['Saldo esperado', `$${saldo.toFixed(2)}`],
        ['Monto real en caja', `$${real.toFixed(2)}`],
        ['Diferencia', `$${diff.toFixed(2)}`],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [44, 26, 14] },
    });

    if (egr.length > 0) {
      const y = doc.lastAutoTable.finalY + 10;
      autoTable(doc, {
        startY: y,
        head: [['Egresos', 'Referencia', 'Descripción', 'Monto']],
        body: egr.map(e => [
          new Date(e.fecha).toLocaleTimeString(),
          e.referencia || '—',
          e.descripcion || '—',
          `$${Number(e.monto).toFixed(2)}`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [44, 26, 14] },
      });
    }

    doc.save(`caja_${caja.id}.pdf`);
  };

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div>
          <p className="ap-eyebrow">Caja</p>
          <h1 className="ap-title">Gestión de caja</h1>
          <p className="ap-subtitle">Apertura, cierre y control de ingresos del día.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn--ghost" onClick={abrirHistorial}>
            Historial
          </button>
          {cajaActiva && (
            <button className="ap-btn ap-btn--danger" onClick={() => setEgresoModal(true)}>
              Registrar egreso
            </button>
          )}
          {cajaActiva ? (
            <button className="ap-btn ap-btn--warning" onClick={async () => {
              setMontoFinal(saldoEsperado.toFixed(2));
              setPendientes([]);
              try {
                const pd = await api('/api/pedidos/?pendientes=1');
                setPendientes(pd);
              } catch (e) { /* el aviso es informativo */ }
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
                  <h3 style={{ margin: 0 }}>Método de pago</h3>
                  <span className="ap-text--muted">Total cobrado: <strong>${totalPagos.toFixed(2)}</strong></span>
                </div>
                <div className="ap-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
                  {desglose.map(m => (
                    <div key={m.key} className="ap-stat-card">
                      <span className="ap-stat-label">{m.label}</span>
                      <span className="ap-stat-value">${m.total.toFixed(2)}</span>
                      <span className="ap-text--muted" style={{ fontSize: 12 }}>
                        {totalPagos > 0 ? `${((m.total / totalPagos) * 100).toFixed(1)}% del total` : '—'}
                      </span>
                    </div>
                  ))}
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
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.length === 0 ? (
                        <tr><td colSpan={6} className="ap-empty">Sin movimientos.</td></tr>
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
                            <td>
                              {m.tipo === 'egreso' && (
                                <div className="ap-row-actions">
                                  <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => iniciarEditarEgreso(m)}>Editar</button>
                                  <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => eliminarEgreso(m)}>Eliminar</button>
                                </div>
                              )}
                            </td>
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

      {/* Modal Registrar / Editar Egreso */}
      {egresoModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEgresoModal(false); }}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>{editarEgreso ? 'Editar egreso' : 'Registrar egreso'}</h3>
              <button className="ap-modal-close" onClick={() => { setEgresoModal(false); setEditarEgreso(null); }}>&times;</button>
            </div>
            <div className="ap-form" style={{ padding: '0 24px' }}>
              <div className="ap-field">
                <label>Monto</label>
                <input className="ap-input" type="number" step="0.01" min="0" placeholder="0.00" value={egresoMonto} onChange={e => setEgresoMonto(e.target.value)} />
              </div>
              <div className="ap-field">
                <label>Referencia</label>
                <input className="ap-input" placeholder="Ej: Proveedor X" value={egresoRef} onChange={e => setEgresoRef(e.target.value)} />
              </div>
              <div className="ap-field">
                <label>Descripción</label>
                <input className="ap-input" placeholder="Ej: Compra de harina" value={egresoDesc} onChange={e => setEgresoDesc(e.target.value)} />
              </div>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => { setEgresoModal(false); setEditarEgreso(null); }}>Cancelar</button>
              <button className="ap-btn ap-btn--danger" onClick={registrarEgreso}>{editarEgreso ? 'Guardar' : 'Registrar'}</button>
            </div>
          </div>
        </div>
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
                <input className="ap-input" value={
                  empleado ? `${empleado.nombre || ''} ${empleado.apellido || ''}`.trim()
                  : user?.is_superuser ? 'Superadmin (operación general)' : ''
                } disabled />
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

      {/* Modal Reporte / Cerrar Caja */}
      {cerrarModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCerrarModal(false); }}>
          <div className="ap-modal ap-modal--wide">
            <div className="ap-modal-header">
              <h3>Reporte y cierre de caja</h3>
              <button className="ap-modal-close" onClick={() => setCerrarModal(false)}>&times;</button>
            </div>
            <div className="ap-form" style={{ padding: '0 24px' }}>
              <div className="ap-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 4 }}>
                <div className="ap-stat-card">
                  <span className="ap-stat-label">Monto inicial</span>
                  <span className="ap-stat-value">${Number(cajaActiva.monto_inicial).toFixed(2)}</span>
                </div>
                <div className="ap-stat-card">
                  <span className="ap-stat-label">Total cobrado</span>
                  <span className="ap-stat-value ap-stat-value--success">${totalPagos.toFixed(2)}</span>
                </div>
                <div className="ap-stat-card">
                  <span className="ap-stat-label">Total egresos</span>
                  <span className="ap-stat-value ap-stat-value--danger">${totalEgresos.toFixed(2)}</span>
                </div>
              </div>

              <p className="ap-text--muted" style={{ fontSize: 13 }}>
                {desglose.map(m => `${m.label}: $${m.total.toFixed(2)}`).join(' · ')}
              </p>

              {egresos.length > 0 && (
                <div className="ap-panel" style={{ padding: 16 }}>
                  <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Egresos del día</strong>
                  <div className="ap-table-wrap">
                    <table className="ap-table">
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Referencia</th>
                          <th>Descripción</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {egresos.map(e => (
                          <tr key={e.id}>
                            <td>{new Date(e.fecha).toLocaleTimeString()}</td>
                            <td>{e.referencia || '—'}</td>
                            <td className="ap-text--muted">{e.descripcion || '—'}</td>
                            <td className="ap-stat-value--danger">${Number(e.monto).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pendientes.length > 0 && (
                <div className="ap-warning-box">
                  <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                    ⚠️ Hay {pendientes.length} pedido(s) cobrables sin pagar
                  </strong>
                  <div className="ap-table-wrap">
                    <table className="ap-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Mesa</th>
                          <th>Total</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendientes.map(p => (
                          <tr key={p.id}>
                            <td>Pedido #{p.id}</td>
                            <td>Mesa {p.mesa_numero}</td>
                            <td>${Number(p.total).toFixed(2)}</td>
                            <td>{p.estado === 'cerrado' ? 'Cerrado' : 'Servido'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="ap-text--muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Si cerrás la caja, estos cobros quedarán bloqueados hasta reabrirla.
                  </p>
                </div>
              )}

              <p>Saldo esperado: <strong>${saldoEsperado.toFixed(2)}</strong></p>
              <div className="ap-field">
                <label>Monto real en caja</label>
                <input className="ap-input" type="number" step="0.01" value={montoFinal} onChange={e => setMontoFinal(e.target.value)} />
              </div>
              <p className={diferencia === 0 ? 'ap-stat-value--success' : 'ap-stat-value--danger'}
                 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18 }}>
                Diferencia: ${diferencia.toFixed(2)}
              </p>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={exportarReporte}>Exportar PDF</button>
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

            <div className="ap-form" style={{ flexDirection: 'row', gap: 12, padding: '0 24px 16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="ap-field">
                <label>Desde</label>
                <input className="ap-input" type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
              </div>
              <div className="ap-field">
                <label>Hasta</label>
                <input className="ap-input" type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
              </div>
              <div className="ap-field">
                <label>Estado</label>
                <select className="ap-input" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="abierta">Abiertas</option>
                  <option value="cerrada">Cerradas</option>
                </select>
              </div>
              <button className="ap-btn ap-btn--primary" onClick={() => loadHistorial()}>Filtrar</button>
              <button className="ap-btn ap-btn--ghost" onClick={limpiarHistorial}>Limpiar</button>
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
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historialLoading ? (
                    <tr><td colSpan={7} className="ap-empty">Cargando…</td></tr>
                  ) : historialCajas.length === 0 ? (
                      <tr><td colSpan={7} className="ap-empty">Sin registros.</td></tr>
                  ) : (
                    historialCajas.map(c => (
                      <tr key={c.id}>
                        <td>{new Date(c.fecha_apertura).toLocaleString()}</td>
                        <td>{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString() : '—'}</td>
                        <td>{c.empleado_apertura}</td>
                        <td>${c.monto_inicial.toFixed(2)}</td>
                        <td>{c.monto_final !== null ? `$${c.monto_final.toFixed(2)}` : '—'}</td>
                        <td><span className={`ap-badge ${c.activa ? 'ap-badge--info' : 'ap-badge--muted'}`}>{c.activa ? 'Abierta' : 'Cerrada'}</span></td>
                        <td>
                          <div className="ap-row-actions">
                            <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => abrirDetalle(c)}>Detalle</button>
                            {!c.activa && (
                              <button className="ap-btn ap-btn--warning ap-btn--sm" onClick={() => reabrirCaja(c)}>Reabrir</button>
                            )}
                          </div>
                        </td>
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

      {/* Modal Detalle de caja */}
      {detalleCaja && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDetalleCaja(null); }}>
          <div className="ap-modal ap-modal--wide">
            <div className="ap-modal-header">
              <h3>Detalle de caja #{detalleCaja.id}</h3>
              <button className="ap-modal-close" onClick={() => setDetalleCaja(null)}>&times;</button>
            </div>

            {detalleLoading ? <div className="ap-loading" style={{ margin: 24 }}>Cargando…</div> : (
              <div className="ap-form" style={{ padding: '0 24px' }}>
                <div className="ap-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 4 }}>
                  <div className="ap-stat-card">
                    <span className="ap-stat-label">Monto inicial</span>
                    <span className="ap-stat-value">${Number(detalleCaja.monto_inicial).toFixed(2)}</span>
                  </div>
                  <div className="ap-stat-card">
                    <span className="ap-stat-label">Ingresos</span>
                    <span className="ap-stat-value ap-stat-value--success">
                      ${detalleMovimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="ap-stat-card">
                    <span className="ap-stat-label">Egresos</span>
                    <span className="ap-stat-value ap-stat-value--danger">
                      ${detalleMovimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="ap-stat-card">
                    <span className="ap-stat-label">Saldo esperado</span>
                    <span className="ap-stat-value">
                      ${(
                        Number(detalleCaja.monto_inicial || 0)
                        + detalleMovimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
                        - detalleMovimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="ap-text--muted" style={{ fontSize: 13 }}>
                  Abierta por {detalleCaja.empleado_apertura} — {new Date(detalleCaja.fecha_apertura).toLocaleString()}
                  {detalleCaja.fecha_cierre ? ` · Cerrada: ${new Date(detalleCaja.fecha_cierre).toLocaleString()}` : ''}
                </p>
                <p className="ap-text--muted" style={{ fontSize: 13, marginBottom: 16 }}>
                  {METODOS_PAGO.map(method => {
                    const total = detallePagos.filter(p => p.metodo === method.key).reduce((s, p) => s + Number(p.monto), 0);
                    return `${method.label}: $${total.toFixed(2)}`;
                  }).join(' · ')}
                </p>

                <div className="ap-table-wrap" style={{ marginBottom: 16 }}>
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Referencia</th>
                        <th>Descripción</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleMovimientos.length === 0 ? (
                        <tr><td colSpan={6} className="ap-empty">Sin movimientos.</td></tr>
                      ) : (
                        detalleMovimientos.map(m => (
                          <tr key={m.id}>
                            <td>{new Date(m.fecha).toLocaleTimeString()}</td>
                            <td>
                              <span className={`ap-badge ${m.tipo === 'ingreso' ? 'ap-badge--ok' : 'ap-badge--no'}`}>
                                {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                              </span>
                            </td>
                            <td className={m.tipo === 'ingreso' ? 'ap-stat-value--success' : 'ap-stat-value--danger'}>
                              ${Number(m.monto).toFixed(2)}
                            </td>
                            <td>{m.referencia || '—'}</td>
                            <td className="ap-text--muted">{m.descripcion || '—'}</td>
                            <td>
                              {m.tipo === 'egreso' && (
                                <div className="ap-row-actions">
                                  <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => iniciarEditarEgreso(m)}>Editar</button>
                                  <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => eliminarEgreso(m)}>Eliminar</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => exportarReporte(detalleCaja, detalleMovimientos, detallePagos, detalleCaja.monto_final || 0)}>
                Exportar PDF
              </button>
              <button className="ap-btn ap-btn--ghost" onClick={() => setDetalleCaja(null)}>Cerrar</button>
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
