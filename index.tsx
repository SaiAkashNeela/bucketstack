import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TrayWindow } from './components/TrayWindow';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getCurrentWindow } from '@tauri-apps/api/window';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

let isTray = false;
try {
  // Check window label safely
  const currentWindow = getCurrentWindow();
  isTray = currentWindow.label === 'tray';
  if (isTray) {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }
} catch (e) {
  console.warn('Failed to get window label, defaulting to App', e);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isTray ? <TrayWindow /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);