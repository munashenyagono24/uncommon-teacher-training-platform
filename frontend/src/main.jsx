import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

// Retrieve keys from Environment Variables
const PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const isClerkConfigured = PUBLISHABLE_KEY && PUBLISHABLE_KEY.startsWith('pk_')

const rootElement = ReactDOM.createRoot(document.getElementById('root'))

// Custom Blue Theme Configuration for Clerk Components
const clerkBlueTheme = {
  variables: {
    colorPrimary: '#2563eb', // Royal Blue matching your dashboard
    colorBackground: '#ffffff',
    colorText: '#1e293b',
    colorTextSecondary: '#64748b',
    borderRadius: '0.5rem',
  },
  elements: {
    formButtonPrimary: 
      'bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all',
    card: 'shadow-md border border-slate-200 rounded-xl',
  }
}

if (isClerkConfigured) {
  rootElement.render(
    <React.StrictMode>
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY}
        appearance={clerkBlueTheme}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  )
} else {
  console.warn(
    'Clerk Publishable Key is missing or invalid. App is running without active authentication.'
  )
  rootElement.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
}