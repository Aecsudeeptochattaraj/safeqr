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

// Suppress benign Vite WebSocket error logs in the dev environment
if (typeof window !== 'undefined') {
  const isViteSocketError = (err: any) => 
    err?.message?.includes('WebSocket') || 
    err?.includes?.('WebSocket') ||
    err?.message?.includes('vite') ||
    err?.target?.url?.includes('vite');

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
