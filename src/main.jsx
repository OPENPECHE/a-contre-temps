import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Enregistre le service worker (nécessaire pour les notifications push + PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
