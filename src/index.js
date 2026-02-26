import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import { Toaster } from 'react-hot-toast';

// Set axios defaults for ngrok (bypass warning page)
const apiBase = process.env.REACT_APP_API_URL || '';
if (apiBase.toLowerCase().includes('ngrok')) {
  axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
