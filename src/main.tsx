// Safeguard: Redefine window.fetch to support both getter and setter to prevent Uncaught TypeError in sandboxed environments
(function() {
  try {
    let originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return originalFetch;
      },
      set(val) {
        originalFetch = val;
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn("Safeguard: Could not redefine window.fetch setter in main.tsx:", e);
  }
})();

// Suppress safe-to-ignore Firestore BloomFilter warning messages
(function() {
  try {
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      if (
        msg.includes('BloomFilter error') || 
        msg.includes('BloomFilterError') || 
        msg.includes('Invalid hash count: 0')
      ) {
        return;
      }
      originalConsoleError.apply(console, args);
    };
  } catch (e) {
    // Fail-safe
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
