import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider, WebSocketProvider } from '@rayshine/shared'
import App from './App.tsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <Router>
          <App />
        </Router>
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>,
)