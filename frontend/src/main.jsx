import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Dashboard from './Dashboard.jsx'
import BookingPage from './BookingPage.jsx' // OUR BRAND NEW PAGE
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* The new dedicated route for bookings */}
        <Route path="/book" element={<BookingPage />} /> 
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)