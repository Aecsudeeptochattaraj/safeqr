import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker
registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
});

// Suppress benign Vite WebSocket and HMR error logs in the dev environment
if (typeof window !== 'undefined') {
  const isViteSocketError = (err: any) => {
    const msg = String(err?.message || err || '').toLowerCase();
    const url = String(err?.target?.url || '').toLowerCase();
    return msg.includes('websocket') || 
           msg.includes('vite') || 
           msg.includes('hmr') ||
           url.includes('vite');
  };

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (args.some(arg => isViteSocketError(arg))) return;
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (args.some(arg => isViteSocketError(arg))) return;
    originalConsoleWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isViteSocketError(event.reason)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (isViteSocketError(event.error) || isViteSocketError(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
