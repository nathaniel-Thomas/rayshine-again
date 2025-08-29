import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, WebSocketProvider } from '@rayshine/shared';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <Router>
          <App />
        </Router>
      </WebSocketProvider>
    </AuthProvider>
  </StrictMode>
);
