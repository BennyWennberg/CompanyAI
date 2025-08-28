// Enhanced Main Layout - Nutzt JSON-basierte Permissions
// Wrapper für das neue Permission-System

import React from 'react';
import { EnhancedPermissionProvider } from '../context/EnhancedPermissionContext';
import Header from './components/Header';
import EnhancedSidebar from './components/EnhancedSidebar';
import './MainLayout.css';

interface EnhancedMainLayoutProps {
  children: React.ReactNode;
  mode?: 'default' | 'fullwidth' | 'compact';
  showSidebar?: boolean;
  apiBaseUrl?: string;
}

const EnhancedMainLayout: React.FC<EnhancedMainLayoutProps> = ({ 
  children, 
  mode = 'default',
  showSidebar = true,
  apiBaseUrl = 'http://localhost:5000'
}) => {
  return (
    <EnhancedPermissionProvider apiBaseUrl={apiBaseUrl}>
      <div className={`main-layout enhanced ${mode}`}>
        <Header />
        <div className="layout-content">
          {showSidebar && <EnhancedSidebar />}
          <main className={`main-content ${!showSidebar ? 'fullwidth' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </EnhancedPermissionProvider>
  );
};

export default EnhancedMainLayout;
