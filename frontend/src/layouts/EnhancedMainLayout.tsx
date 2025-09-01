// Modern Customer-Focused Layout - Professional SaaS Experience
// Enhanced with modern design patterns and accessibility

import React, { useState, useEffect } from 'react';
import { EnhancedPermissionProvider } from '../context/EnhancedPermissionContext';
import Header from './components/Header';
import EnhancedSidebar from './components/EnhancedSidebar';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import './MainLayout.css';

interface EnhancedMainLayoutProps {
  children: React.ReactNode;
  mode?: 'default' | 'fullwidth' | 'compact';
  showSidebar?: boolean;
  apiBaseUrl?: string;
  className?: string;
}

const EnhancedMainLayout: React.FC<EnhancedMainLayoutProps> = ({ 
  children, 
  mode = 'default',
  showSidebar = true,
  apiBaseUrl = 'http://localhost:5000',
  className = ''
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <EnhancedPermissionProvider apiBaseUrl={apiBaseUrl}>
      <div className={`modern-layout enhanced-layout ${mode} ${className} ${
        isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
      } ${isMobile ? 'mobile' : 'desktop'}`}>
        
        {/* Modern Header */}
        <Header />
        
        {/* Mobile Sidebar Toggle */}
        {isMobile && (
          <button 
            className="mobile-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={isMobileSidebarOpen ? 'Navigation schließen' : 'Navigation öffnen'}
            aria-expanded={isMobileSidebarOpen}
          >
            {isMobileSidebarOpen ? (
              <XMarkIcon className="toggle-icon" />
            ) : (
              <Bars3Icon className="toggle-icon" />
            )}
          </button>
        )}

        {/* Layout Content Container */}
        <div className="layout-content-container">
          
          {/* Enhanced Sidebar */}
          {showSidebar && (
            <>
              <aside className={`sidebar-wrapper ${
                isMobile 
                  ? (isMobileSidebarOpen ? 'mobile-open' : 'mobile-closed')
                  : (isSidebarCollapsed ? 'collapsed' : 'expanded')
              }`}>
                <div className="sidebar-content">
                  {!isMobile && (
                    <button 
                      className="desktop-sidebar-toggle"
                      onClick={toggleSidebar}
                      title={isSidebarCollapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
                      aria-label={isSidebarCollapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
                    >
                      {isSidebarCollapsed ? (
                        <Bars3Icon className="toggle-icon" />
                      ) : (
                        <XMarkIcon className="toggle-icon" />
                      )}
                    </button>
                  )}
                  <EnhancedSidebar />
                </div>
              </aside>

              {/* Mobile Overlay */}
              {isMobile && isMobileSidebarOpen && (
                <div 
                  className="mobile-overlay"
                  onClick={closeMobileSidebar}
                  aria-hidden="true"
                />
              )}
            </>
          )}

          {/* Main Content Area */}
          <main className={`main-content-area ${
            !showSidebar ? 'fullwidth' : ''
          } ${mode === 'fullwidth' ? 'mode-fullwidth' : ''}`}>
            <div className="content-wrapper">
              <div className="page-content animate-fade-in">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </EnhancedPermissionProvider>
  );
};

export default EnhancedMainLayout;
