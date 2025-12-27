import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@chatsdk/react/themes/default.css';
import './styles.css';

// Apply theme to document
document.documentElement.setAttribute('data-theme', 'light');
document.body.style.fontFamily = '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system';
document.body.style.margin = '0';
document.body.style.letterSpacing = '-0.011em';
document.body.style.WebkitFontSmoothing = 'antialiased';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="chatsdk-root" data-theme="light">
      <App />
    </div>
  </React.StrictMode>
);
