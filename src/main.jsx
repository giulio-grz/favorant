import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initializeNetworkHandling } from './lib/networkHandler';

// Add this before the ReactDOM.render call
initializeNetworkHandling();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)