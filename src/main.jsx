import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui'
import { LiveProvider } from './context/LiveContext'
import { reportClientError } from './lib/http'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, retry: 1 } } })

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => reportClientError({
    message: e.message || 'Window error',
    stack: e.error?.stack || `${e.filename || ''}:${e.lineno || 0}`,
    url: window.location.href,
    severity: 'critical',
  }))
  window.addEventListener('unhandledrejection', (e) => reportClientError({
    message: e.reason?.message || String(e.reason || 'Unhandled promise rejection'),
    stack: e.reason?.stack || '',
    url: window.location.href,
    severity: 'warning',
  }))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <LiveProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </LiveProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
