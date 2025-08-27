import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';

// DataProvider'ı import ediyoruz
import { DataProvider } from './context/DataContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* TÜM UYGULAMAYI BU PROVIDER İLE SARMALIYORUZ */}
    <DataProvider>
      <CssBaseline />
      <App />
    </DataProvider>
  </React.StrictMode>
);