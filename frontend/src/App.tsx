import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import Dashboard from './components/Dashboard';
import LoginPage from './modules/auth/LoginPage';
import HRModule from './modules/hr/HRModule';
import SupportModule from './modules/support/SupportModule';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          } />
          
          {/* Protected Routes with Layout */}
          <Route path="/" element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          } />
          
          <Route path="/hr/*" element={
            <MainLayout>
              <HRModule />
            </MainLayout>
          } />
          
          <Route path="/support/*" element={
            <MainLayout>
              <SupportModule />
            </MainLayout>
          } />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
