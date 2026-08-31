import React from 'react';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText = 'Confirmar', confirmClass = 'ap-btn--danger' }) {
  if (!open) return null;

  return (
    <div className="ap-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="ap-modal ap-modal--sm">
        <div className="ap-modal-header">
          <h3>{title}</h3>
          <button className="ap-modal-close" onClick={onCancel}>&times;</button>
        </div>
        <p className="cm-msg">{message}</p>
        <div className="ap-modal-footer">
          <button className="ap-btn ap-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className={`ap-btn ${confirmClass}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
