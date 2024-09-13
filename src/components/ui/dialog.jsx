import React from 'react';
import { createPortal } from 'react-dom';

export const Dialog = ({ children, open, onOpenChange }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white p-6 rounded-lg shadow-lg">
        {children}
      </div>
    </div>,
    document.body
  );
};

export const DialogContent = ({ children }) => {
  return <div className="min-w-[300px]">{children}</div>;
};

export const DialogTitle = ({ children }) => {
  return <h2 className="text-lg font-bold mb-4">{children}</h2>;
};

export const DialogClose = ({ children, ...props }) => {
  return React.cloneElement(children, props);
};