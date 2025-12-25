import React from 'react';


const variantClasses = {
  primary: 'bg-blue-600 text-gray-900 dark:text-white hover:bg-blue-700',
  secondary: 'bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-700',
  outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50',
};

function Button({ children, variant = 'primary', onClick, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded transition ${variantClasses[variant]}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;