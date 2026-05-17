import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

// Global fetch interceptor: auto-add JWT + handle 401 redirects
const originalFetch = window.fetch.bind(window);
window.fetch = async (url, options = {}) => {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const token = localStorage.getItem('token');
    if (token) {
      options = {
        ...options,
        headers: {
          Authorization: 'Bearer ' + token,
          ...(options.headers || {}),
        },
      };
    }
  }
  const response = await originalFetch(url, options);
  if (
    response.status === 401 &&
    typeof url === 'string' &&
    url.startsWith('/api/') &&
    !url.includes('/api/auth/')
  ) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
