import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const isClerkConfigured = PUBLISHABLE_KEY && PUBLISHABLE_KEY.startsWith('pk_')

const rootElement = ReactDOM.createRoot(document.getElementById('root'))

if (isClerkConfigured) {
  rootElement.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  )
} else {
  console.warn("Clerk Publishable Key (VITE_CLERK_PUBLISHABLE_KEY) is missing or invalid. App is running without active authentication.")
  rootElement.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
}
