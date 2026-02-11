import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import UserLogin from './pages/UserLogin.jsx'
import UserSignup from './pages/UserSignup.jsx'
import DriverLogin from './pages/CaptainLogin.jsx'
import DriverSignup from './pages/CaptainSignup.jsx'
import UserHome from './pages/UserHome.jsx'
import DriverDashboard from './pages/DriverDashboard.jsx'
import { WebSocketProvider } from './context/WebSocketContext.jsx'

const App = () => {
  return (
    <WebSocketProvider>
      <Routes>
        <Route path="/" element={<Home />}></Route>
        <Route path="/user/login" element={<UserLogin />}></Route>
        <Route path="/user/signup" element={<UserSignup />}></Route>
        <Route path="/user/home" element={<UserHome />}></Route>
        <Route path="/driver/login" element={<DriverLogin />}></Route>
        <Route path="/driver/signup" element={<DriverSignup />}></Route>
        <Route path="/driver/dashboard" element={<DriverDashboard />}></Route>
      </Routes>
    </WebSocketProvider>
  )
}

export default App

