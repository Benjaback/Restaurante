import React from 'react';

const ConfirmModal = ({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmClass = '' }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn--secondary" onClick={onCancel}>{cancelText}</button>
          <button className={`btn btn--primary ${confirmClass}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
