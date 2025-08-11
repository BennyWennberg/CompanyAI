// React import removed - not needed in modern React with JSX Transform
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import Dashboard from './components/Dashboard';
import LoginPage from './modules/auth/LoginPage';
import HRModule from './modules/hr/HRModule';
import SupportModule from './modules/support/SupportModule';
import AIModule from './modules/ai/AIModule';
import RequireAuth from './components/RequireAuth';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeSettings from './components/ThemeSettings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <ErrorBoundary>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          } />
          
          {/* Protected Routes with Layout */}
          <Route path="/" element={
            <RequireAuth>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </RequireAuth>
          } />
          
          <Route path="/hr/*" element={
            <RequireAuth>
              <MainLayout>
                <HRModule />
              </MainLayout>
            </RequireAuth>
          } />
          
          <Route path="/support/*" element={
            <RequireAuth>
              <MainLayout>
                <SupportModule />
              </MainLayout>
            </RequireAuth>
          } />

          <Route path="/ai/*" element={
            <RequireAuth>
              <MainLayout>
                <AIModule />
              </MainLayout>
            </RequireAuth>
          } />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
        <ThemeSettings />
      </div>
    </Router>
  );
}

export default App;
