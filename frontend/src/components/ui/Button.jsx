import React from 'react';

const Button = ({ children, onClick, variant = 'primary', type = 'button', disabled, className = '', ...props }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn--${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
