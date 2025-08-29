import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';

// Context Provider'larını import ediyoruz
import { DataProvider } from './context/DataContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Router ve Provider'lar ile uygulamayı sarmalıyoruz */}
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <CssBaseline />
          <App />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);