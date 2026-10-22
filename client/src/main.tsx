import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

// Prevent accidental mouse wheel increment/decrement on focused number inputs
document.addEventListener(
  'wheel',
  () => {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

