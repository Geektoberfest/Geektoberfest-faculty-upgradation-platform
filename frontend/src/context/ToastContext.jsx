/**
 * ToastContext.jsx
 *
 * Centralized Toast Notification Context & Provider.
 * Allows any component in the application tree to dispatch floating toast
 * notifications via the `useToast()` hook:
 *   const { toast } = useToast();
 *   toast.success('Course created successfully!');
 *   toast.error('Failed to load data.');
 *   toast.info('Session refreshed.');
 */

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/common/Toast';

const ToastContext = createContext(null);

const DEFAULT_TOAST_DURATION = 4000; // 4 seconds auto-dismiss

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = DEFAULT_TOAST_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  const value = {
    toasts,
    addToast,
    removeToast,
    showToast: addToast,
    toast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Toast Notification Container (Top-Right) */}
      <div
        className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((item) => (
          <Toast key={item.id} toast={item} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
