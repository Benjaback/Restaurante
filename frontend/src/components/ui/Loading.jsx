import React from 'react';

const Loading = ({ message = 'Cargando...' }) => (
  <div className="loading">
    <div className="loading-spinner" />
    <p>{message}</p>
  </div>
);

export default Loading;
