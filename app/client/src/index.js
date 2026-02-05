// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";

// Suppress ResizeObserver errors globally
if (typeof window !== 'undefined') {
  const resizeObserverErr = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string' && 
        (message.includes('ResizeObserver loop') || 
         message.includes('ResizeObserver loop limit exceeded'))) {
      return true; // Suppress the error
    }
    if (resizeObserverErr) {
      return resizeObserverErr(message, source, lineno, colno, error);
    }
    return false;
  };

  // Also override console.error
  const originalError = console.error;
  console.error = function(...args) {
    try {
      const message = String(args[0] || '');
      if (/ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i.test(message)) {
        return;
      }
    } catch (e) {
      // fallback to original console on any issue
    }
    originalError.apply(console, args);
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);