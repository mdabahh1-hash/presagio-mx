import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './i18n'
import { initAnalytics } from './lib/analytics'
import { captureRefFromUrl } from './lib/referral'
import { redirectPathToHash } from './lib/pathToHash'

redirectPathToHash()
initAnalytics()
captureRefFromUrl()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
