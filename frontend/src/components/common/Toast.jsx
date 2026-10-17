/**
 * Toast.jsx
 *
 * Reusable Toast Notification Banner Component.
 * Renders individual floating notification cards with semantic styling,
 * icon indicators (success, error, info), and manual dismiss action.
 */

import React from 'react';

const TOAST_VARIANTS = {
  success: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    border: 'rgba(34, 197, 94, 0.5)',
    bg: 'rgba(20, 83, 45, 0.25)',
    color: '#86efac',
  },
  error: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    border: 'rgba(239, 68, 68, 0.5)',
    bg: 'rgba(127, 29, 29, 0.25)',
    color: '#fca5a5',
  },
  info: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 text-cyan-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    border: 'rgba(6, 182, 212, 0.5)',
    bg: 'rgba(8, 51, 68, 0.25)',
    color: '#67e8f9',
  },
};

export default function Toast({ toast, onClose }) {
  const variant = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info;

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl backdrop-blur-md transition-all duration-300 animate-fadeIn"
      style={{
        background: 'rgba(30, 41, 59, 0.95)',
        border: `1px solid ${variant.border}`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="shrink-0 mt-0.5">{variant.icon}</div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-sm font-medium leading-snug break-words" style={{ color: variant.color }}>
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-700/50 cursor-pointer text-xs"
      >
        ✕
      </button>
    </div>
  );
}
