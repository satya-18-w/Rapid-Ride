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
import { UserProvider } from './context/UserContext.jsx'
import CaptainDetails from './pages/CaptainDetails.jsx'

const App = () => {
  return (
    <UserProvider>
      <WebSocketProvider>
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/user/login" element={<UserLogin />}></Route>
          <Route path="/user/signup" element={<UserSignup />}></Route>
          <Route path="/user/home" element={<UserHome />}></Route>
          <Route path="/driver/login" element={<DriverLogin />}></Route>
          <Route path="/driver/signup" element={<DriverSignup />}></Route>
          <Route path="/driver/dashboard" element={<DriverDashboard />}></Route>
          <Route path="/captain-details" element={<CaptainDetails />}></Route>
        </Routes>
      </WebSocketProvider>
    </UserProvider>
  )
}

export default App

