'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type, leaving: false }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev =>
          prev.map(t => t.id === id ? { ...t, leaving: true } : t)
        );
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
      }, duration);
    }
    return id;
  }, []);

  const toast = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);
  toast.success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  toast.error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  toast.warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.type]} ${t.leaving ? styles.leaving : ''}`}
          >
            <span className={styles.icon}>
              {t.type === 'success' && '✅'}
              {t.type === 'error' && '❌'}
              {t.type === 'warning' && '⚠️'}
              {t.type === 'info' && 'ℹ️'}
            </span>
            <span className={styles.message}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
