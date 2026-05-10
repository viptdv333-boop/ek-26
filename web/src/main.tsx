import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

// Apply theme before first render to prevent flash
const theme = localStorage.getItem('ek26_theme') || 'dark';
if (theme === 'light') {
  document.documentElement.classList.add('light');
}

// Inject admin-configured meta tags into <head> (analytics, verification, etc.)
fetch('/api/public/meta-tags')
  .then((r) => r.json())
  .then((data: { html?: string }) => {
    const html = (data?.html || '').trim();
    if (!html) return;
    const container = document.createElement('div');
    container.innerHTML = html;
    Array.from(container.children).forEach((node) => {
      try {
        // Re-create script tags so they execute (innerHTML doesn't run scripts)
        if (node.tagName === 'SCRIPT') {
          const orig = node as HTMLScriptElement;
          const s = document.createElement('script');
          for (const attr of Array.from(orig.attributes)) s.setAttribute(attr.name, attr.value);
          s.text = orig.text;
          document.head.appendChild(s);
        } else {
          document.head.appendChild(node);
        }
      } catch (e) {
        console.warn('Failed to inject meta node:', e);
      }
    });
  })
  .catch(() => {});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Service worker registered in firebase.ts — no duplicate registration here
