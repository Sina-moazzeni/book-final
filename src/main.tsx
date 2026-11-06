import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill Promise.withResolvers for browsers that don't yet support ES2024
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Iframe & Sandbox-safe alert and confirm polyfills to avoid DOMException inside sandboxed preview
if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    console.log('[System Alert]:', message);
    let container = document.getElementById('global-alert-toast-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-alert-toast-root';
      container.style.cssText =
        'position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 9999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; max-width: 90vw;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText =
      'pointer-events: auto; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 12px 20px; border-radius: 12px; font-family: "Vazirmatn", sans-serif; font-size: 13.5px; direction: rtl; text-align: right; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); cursor: pointer; transition: all 0.25s ease; opacity: 0; transform: translateY(-8px);';
    toast.textContent = String(message ?? '');

    toast.onclick = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(() => toast.remove(), 250);
    };

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 4500);
  };

  const nativeConfirm = window.confirm ? window.confirm.bind(window) : null;
  window.confirm = (message?: string): boolean => {
    try {
      if (nativeConfirm) return nativeConfirm(message);
    } catch {
      console.warn('[Confirmation bypassed due to iframe sandbox policy]:', message);
      return true;
    }
    return true;
  };
}

createRoot(document.getElementById('root')!).render(<App />);
