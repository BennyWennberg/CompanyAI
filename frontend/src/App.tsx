// React import removed - not needed in modern React with JSX Transform
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import EnhancedMainLayout from './layouts/EnhancedMainLayout';
import AuthLayout from './layouts/AuthLayout';
import EnhancedDashboard from './components/EnhancedDashboard';
import LoginPage from './modules/auth/LoginPage';
import MultiProviderLoginPage from './modules/auth/MultiProviderLoginPage';
import EntraCallbackPage from './modules/auth/EntraCallbackPage';
import HRModule from './modules/hr/HRModule';
import SupportModule from './modules/support/SupportModule';
import AIModule from './modules/ai/AIModule';
import AdminPortalModule from './modules/admin-portal/AdminPortalModule';
import RequireAuth from './components/RequireAuth';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeSettings from './components/ThemeSettings';
import { EnhancedPermissionProvider, ModuleAccessGate } from './context/EnhancedPermissionContext';
import './components/EnhancedDashboard.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <ErrorBoundary>
        <EnhancedPermissionProvider>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={
            <AuthLayout>
              <MultiProviderLoginPage />
            </AuthLayout>
          } />
          <Route path="/login/old" element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          } />
          <Route path="/auth/callback/entra" element={<EntraCallbackPage />} />
          
          {/* Protected Routes with Enhanced Layout and Permissions */}
          <Route path="/" element={
            <RequireAuth>
              <EnhancedMainLayout>
                <EnhancedDashboard />
              </EnhancedMainLayout>
            </RequireAuth>
          } />
          
          <Route path="/hr/*" element={
            <RequireAuth>
              <ModuleAccessGate module="hr" fallback={<Navigate to="/" replace />}>
                <EnhancedMainLayout>
                  <HRModule />
                </EnhancedMainLayout>
              </ModuleAccessGate>
            </RequireAuth>
          } />
          
          <Route path="/support/*" element={
            <RequireAuth>
              <ModuleAccessGate module="support" fallback={<Navigate to="/" replace />}>
                <EnhancedMainLayout>
                  <SupportModule />
                </EnhancedMainLayout>
              </ModuleAccessGate>
            </RequireAuth>
          } />

          <Route path="/ai/*" element={
            <RequireAuth>
              <ModuleAccessGate module="ai" fallback={<Navigate to="/" replace />}>
                <EnhancedMainLayout>
                  <AIModule />
                </EnhancedMainLayout>
              </ModuleAccessGate>
            </RequireAuth>
          } />

          <Route path="/admin-portal/*" element={
            <RequireAuth>
              <ModuleAccessGate module="admin_portal" requiredLevel="admin" fallback={<Navigate to="/" replace />}>
                <EnhancedMainLayout>
                  <AdminPortalModule />
                </EnhancedMainLayout>
              </ModuleAccessGate>
            </RequireAuth>
          } />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </EnhancedPermissionProvider>
        </ErrorBoundary>
        <ThemeSettings />
      </div>
    </Router>
  );
}

export default App;
