import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import ConfirmModal from '../../../components/ConfirmModal';
import api from '../../../services/api';

const ESTADOS = {
  abierto: 'Abierto',
  en_preparacion: 'En preparación',
  servido: 'Servido',
  cerrado: 'Cerrado',
  pagado: 'Pagado',
};

const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia'];

export default function AdminPedidos() {
  const { empleado } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [mesas, setMesas] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState('');
  const [carrito, setCarrito] = useState([]);

  const [pagoModal, setPagoModal] = useState(null);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('efectivo');
  const [pagoVuelto, setPagoVuelto] = useState('');

  const [ticketModal, setTicketModal] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [cajaAbierta, setCajaAbierta] = useState(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    api('/api/cajas/').then(data => {
      const activa = data.find(c => c.activa);
      setCajaAbierta(activa || false);
    }).catch(() => setCajaAbierta(false));
  }, []);

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroEstado ? `?estado=${filtroEstado}` : '';
      setPedidos(await api(`/api/pedidos/${params}`));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filtroEstado]);

  useEffect(() => { loadPedidos(); }, [loadPedidos]);

  const loadMesasPlatos = async () => {
    try {
      const [m, p] = await Promise.all([
        api('/api/mesas/'),
        api('/api/platos/'),
      ]);
      setMesas(m.filter(mm => mm.activa));
      setPlatos(p.filter(pp => pp.activo));
    } catch (e) { setError(e.message); }
  };

  const openNuevoPedido = async () => {
    await loadMesasPlatos();
    setSelectedMesa('');
    setCarrito([]);
    setModalOpen(true);
  };

  const addPlatoAlCarrito = (plato) => {
    setCarrito(prev => {
      const existente = prev.find(c => c.plato_id === plato.id);
      if (existente) {
        return prev.map(c => c.plato_id === plato.id ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      return [...prev, { plato_id: plato.id, nombre: plato.nombre, precio: plato.precio, cantidad: 1 }];
    });
  };

  const removeDelCarrito = (platoId) => {
    setCarrito(prev => {
      const existente = prev.find(c => c.plato_id === platoId);
      if (existente && existente.cantidad > 1) {
        return prev.map(c => c.plato_id === platoId ? { ...c, cantidad: c.cantidad - 1 } : c);
      }
      return prev.filter(c => c.plato_id !== platoId);
    });
  };

  const totalCarrito = carrito.reduce((sum, c) => sum + c.precio * c.cantidad, 0);

  const crearPedido = async () => {
    if (!selectedMesa || carrito.length === 0) {
      setError('Seleccioná una mesa y agregá al menos un plato');
      return;
    }
    try {
      await api('/api/pedidos/', {
        method: 'POST',
        body: JSON.stringify({
          mesa_id: parseInt(selectedMesa),
          empleado_id: empleado.id,
          detalles: carrito.map(c => ({ plato_id: c.plato_id, cantidad: c.cantidad })),
        }),
      });
      setModalOpen(false);
      loadPedidos();
    } catch (e) { setError(e.message); }
  };

  const confirmarPedido = async (pedido) => {
    try {
      await api(`/api/pedidos/${pedido.id}/confirmar/`, { method: 'POST' });
      loadPedidos();
    } catch (e) { setError(e.message); }
  };

  const cambiarEstado = async (pedido, estado) => {
    try {
      await api(`/api/pedidos/${pedido.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      loadPedidos();
    } catch (e) { setError(e.message); }
  };

  const registrarPago = async () => {
    if (!pagoMonto) {
      setError('Ingresá el monto');
      return;
    }
    try {
      await api('/api/pagos/', {
        method: 'POST',
        body: JSON.stringify({
          pedido_id: pagoModal.id,
          monto: parseFloat(pagoMonto),
          metodo: pagoMetodo,
          vuelto: pagoMetodo === 'efectivo' ? parseFloat(pagoVuelto || 0) : 0,
        }),
      });
      setPagoModal(null);
      setPagoMonto('');
      setPagoMetodo('efectivo');
      setPagoVuelto('');
      loadPedidos();
    } catch (e) { setError(e.message); }
  };

  const verTicket = async (pedido) => {
    try {
      const tickets = await api(`/api/tickets/?pedido_id=${pedido.id}`);
      if (tickets.length > 0) setTicketModal(tickets[0]);
    } catch (e) { setError(e.message); }
  };

  const filtrar = (valor) => {
    setFiltroEstado(valor);
  };

  const pedidosFiltrados = filtroEstado
    ? pedidos.filter(p => p.estado === filtroEstado)
    : pedidos;

  const badgeClass = (estado) => {
    const map = {
      abierto: 'ap-badge--warn',
      en_preparacion: 'ap-badge--info',
      servido: 'ap-badge--ok',
      cerrado: 'ap-badge--muted',
      pagado: 'ap-badge--ok',
    };
    return map[estado] || '';
  };

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div>
          <p className="ap-eyebrow">Pedidos</p>
          <h1 className="ap-title">Gestión de pedidos</h1>
          <p className="ap-subtitle">Creá, gestioná y facturá pedidos de mesas.</p>
        </div>
        <button className="ap-btn ap-btn--primary" onClick={openNuevoPedido} disabled={!cajaAbierta}>
          + Nuevo pedido
        </button>
      </header>

      {error && <div className="ap-error-bar">{error}</div>}
      {cajaAbierta === false && (
        <div className="ap-error-bar" style={{ background: '#6d3b1f' }}>
          No hay una caja abierta. Abrí la caja antes de crear pedidos.
        </div>
      )}

      <div className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-filter-group">
            <button
              className={`ap-btn ap-btn--sm ${!filtroEstado ? 'ap-btn--primary' : 'ap-btn--ghost'}`}
              onClick={() => filtrar('')}
            >
              Todos
            </button>
            {Object.entries(ESTADOS).map(([key, label]) => (
              <button
                key={key}
                className={`ap-btn ap-btn--sm ${filtroEstado === key ? 'ap-btn--primary' : 'ap-btn--ghost'}`}
                onClick={() => filtrar(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="ap-results-count">{pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? <div className="ap-loading">Cargando…</div> : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Mesero</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="ap-empty">No hay pedidos.</td></tr>
                ) : (
                  pedidosFiltrados.map(p => (
                    <tr key={p.id}>
                      <td>Mesa {p.mesa_numero}</td>
                      <td>{p.empleado_nombre}</td>
                      <td><span className={`ap-badge ${badgeClass(p.estado)}`}>{ESTADOS[p.estado]}</span></td>
                      <td>${p.total.toFixed(2)}</td>
                      <td>{new Date(p.fecha_creacion).toLocaleString()}</td>
                      <td>
                        <div className="ap-actions" style={{ flexWrap: 'wrap', gap: 4 }}>
                          {p.estado === 'abierto' && (
                            <>
                              <button className="ap-btn ap-btn--success ap-btn--sm" onClick={() => confirmarPedido(p)}>
                                Confirmar
                              </button>
                              <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setConfirmAction({ pedido: p, action: 'eliminar' })}>
                                Eliminar
                              </button>
                            </>
                          )}
                          {p.estado === 'en_preparacion' && (
                            <button className="ap-btn ap-btn--primary ap-btn--sm" onClick={() => cambiarEstado(p, 'servido')}>
                              Servir
                            </button>
                          )}
                          {p.estado === 'servido' && (
                            <button className="ap-btn ap-btn--primary ap-btn--sm" onClick={() => cambiarEstado(p, 'cerrado')}>
                              Cerrar cuenta
                            </button>
                          )}
                          {p.estado === 'cerrado' && (
                            <button className="ap-btn ap-btn--success ap-btn--sm" onClick={() => {
                              setPagoModal(p);
                              setPagoMonto(p.total.toString());
                              setPagoMetodo('efectivo');
                              setPagoVuelto('');
                            }}>
                              Cobrar
                            </button>
                          )}
                          {p.estado === 'pagado' && (
                            <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => verTicket(p)}>
                              Ticket
                            </button>
                          )}
                          <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setConfirmAction({ pedido: p, action: 'detalles' })}>
                            Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Pedido */}
      {modalOpen && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="ap-modal ap-modal--wide">
            <div className="ap-modal-header">
              <h3>Nuevo pedido</h3>
              <button className="ap-modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="ap-form" style={{ padding: '0 24px' }}>
              <div className="ap-field">
                <label>Mesa</label>
                <select className="ap-input" value={selectedMesa} onChange={e => setSelectedMesa(e.target.value)}>
                  <option value="">Seleccionar mesa…</option>
                  {mesas.map(m => (
                    <option key={m.id} value={m.id}>Mesa {m.numero} (cap. {m.capacidad})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <label>Platos disponibles</label>
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #333', borderRadius: 8, marginTop: 8 }}>
                    {platos.filter(p => !carrito.find(c => c.plato_id === p.id) || true).map(plato => (
                      <div
                        key={plato.id}
                        className="ap-pedido-plato-item"
                        onClick={() => addPlatoAlCarrito(plato)}
                      >
                        <div>
                          <strong>{plato.nombre}</strong>
                          <span className="ap-text--muted" style={{ marginLeft: 8 }}>{plato.categoria?.nombre || ''}</span>
                        </div>
                        <span>${plato.precio.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label>Carrito</label>
                  {carrito.length === 0 ? (
                    <p className="ap-text--muted" style={{ marginTop: 8 }}>Agregá platos desde la lista.</p>
                  ) : (
                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #333', borderRadius: 8, marginTop: 8 }}>
                      {carrito.map(c => (
                        <div key={c.plato_id} className="ap-pedido-plato-item">
                          <div>
                            <strong>{c.nombre}</strong>
                            <span className="ap-text--muted" style={{ marginLeft: 8 }}>x{c.cantidad}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>${(c.precio * c.cantidad).toFixed(2)}</span>
                            <button className="ap-btn ap-btn--danger ap-btn--xs" onClick={() => removeDelCarrito(c.plato_id)}>
                              −
                            </button>
                          </div>
                        </div>
                      ))}
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>Total</span>
                        <span>${totalCarrito.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="ap-btn ap-btn--primary" onClick={crearPedido} disabled={!selectedMesa || carrito.length === 0}>
                Crear pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago */}
      {pagoModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPagoModal(null); }}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Cobrar Pedido #{pagoModal.id}</h3>
              <button className="ap-modal-close" onClick={() => setPagoModal(null)}>&times;</button>
            </div>
            <div className="ap-form" style={{ padding: '0 24px' }}>
              <p style={{ marginBottom: 16 }}>
                <strong>Total:</strong> ${pagoModal.total.toFixed(2)} &nbsp;|&nbsp;
                <strong>Mesa:</strong> {pagoModal.mesa_numero}
              </p>
              <div className="ap-field">
                <label>Método de pago</label>
                <select className="ap-input" value={pagoMetodo} onChange={e => setPagoMetodo(e.target.value)}>
                  {METODOS_PAGO.map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="ap-field">
                <label>Monto recibido</label>
                <input className="ap-input" type="number" step="0.01" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} />
              </div>
              {pagoMetodo === 'efectivo' && (
                <div className="ap-field">
                  <label>Vuelto (opcional)</label>
                  <input className="ap-input" type="number" step="0.01" value={pagoVuelto} onChange={e => setPagoVuelto(e.target.value)} placeholder="0" />
                </div>
              )}
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setPagoModal(null)}>Cancelar</button>
              <button className="ap-btn ap-btn--success" onClick={registrarPago}>Confirmar pago</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ticket */}
      {ticketModal && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setTicketModal(null); }}>
          <div className="ap-modal" style={{ maxWidth: 400 }}>
            <div className="ap-modal-header">
              <h3>Ticket</h3>
              <button className="ap-modal-close" onClick={() => setTicketModal(null)}>&times;</button>
            </div>
            <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'monospace' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>La Casa Grande</h2>
              <p className="ap-text--muted" style={{ margin: '4px 0 16px' }}>Ticket de consumo</p>
              <hr style={{ border: '1px dashed #555', margin: '8px 0' }} />
              <p>Pedido #{ticketModal.pedido_id} — Mesa {ticketModal.mesa_numero}</p>
              <p className="ap-text--muted">Atendido por: {ticketModal.empleado_nombre}</p>
              <hr style={{ border: '1px dashed #555', margin: '8px 0' }} />
              <p style={{ fontSize: 24, fontWeight: 'bold', margin: '16px 0' }}>
                Total: ${ticketModal.total.toFixed(2)}
              </p>
              <hr style={{ border: '1px dashed #555', margin: '8px 0' }} />
              <p className="ap-text--muted" style={{ fontSize: 12 }}>
                {new Date(ticketModal.fecha_emision).toLocaleString()}
              </p>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setTicketModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {confirmAction?.action === 'detalles' && (
        <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmAction(null); }}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Pedido #{confirmAction.pedido.id} — Mesa {confirmAction.pedido.mesa_numero}</h3>
              <button className="ap-modal-close" onClick={() => setConfirmAction(null)}>&times;</button>
            </div>
            <div style={{ padding: '0 24px' }}>
              <p><strong>Mesero:</strong> {confirmAction.pedido.empleado_nombre}</p>
              <p><strong>Estado:</strong> {ESTADOS[confirmAction.pedido.estado]}</p>
              <p><strong>Fecha:</strong> {new Date(confirmAction.pedido.fecha_creacion).toLocaleString()}</p>
              {confirmAction.pedido.fecha_cierre && (
                <p><strong>Cerrado:</strong> {new Date(confirmAction.pedido.fecha_cierre).toLocaleString()}</p>
              )}
            </div>
            {confirmAction.pedido.detalles && confirmAction.pedido.detalles.length > 0 && (
              <table className="ap-table" style={{ margin: '16px 24px', width: 'calc(100% - 48px)' }}>
                <thead>
                  <tr>
                    <th>Plato</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmAction.pedido.detalles.map(d => (
                    <tr key={d.id || d.plato_id}>
                      <td>{d.plato_nombre}</td>
                      <td>{d.cantidad}</td>
                      <td>${d.precio_unitario.toFixed(2)}</td>
                      <td>${d.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan={3} style={{ textAlign: 'right' }}>Total</td>
                    <td>${confirmAction.pedido.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={() => setConfirmAction(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmAction?.action === 'eliminar'}
        title="Eliminar pedido"
        message={`¿Estás seguro de eliminar el Pedido #${confirmAction?.pedido?.id}?`}
        confirmText="Eliminar"
        confirmClass="ap-btn--danger"
        onConfirm={async () => {
          try {
            await api(`/api/pedidos/${confirmAction.pedido.id}/`, { method: 'DELETE' });
            setConfirmAction(null);
            loadPedidos();
          } catch (e) { setError(e.message); }
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <style>{`
        .ap-pedido-plato-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid #2a2a2a;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ap-pedido-plato-item:hover {
          background: #2a2a2a;
        }
        .ap-modal--wide {
          max-width: 700px;
        }
      `}</style>
    </div>
  );
}
