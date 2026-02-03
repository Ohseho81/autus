/**
 * AUTUS UI v1 - Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Global reset styles
const globalCSS = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html, body, #root {
    height: 100%;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Focus visible for accessibility */
  :focus-visible {
    outline: 2px solid #4ade80;
    outline-offset: 2px;
  }
  
  /* Remove focus outline for mouse users */
  :focus:not(:focus-visible) {
    outline: none;
  }
`;

// Inject global styles
const styleSheet = document.createElement('style');
styleSheet.textContent = globalCSS;
document.head.appendChild(styleSheet);

// Mount app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
