import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GameProvider } from './GameEngine.jsx'
import AuthGate from './AuthGate.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      <GameProvider>
         <App />
      </GameProvider>
    </AuthGate>
  </React.StrictMode>,
)
