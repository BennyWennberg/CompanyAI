// Enhanced Sidebar - Nutzt JSON-basierte Permissions
// Dynamische Module basierend auf department-permissions.json

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEnhancedPermissions, ModuleAccessGate, EnhancedPermissionDebugInfo, ModuleName } from '../../context/EnhancedPermissionContext';
import './Sidebar.css';

// Navigation Item Interface für Enhanced System
interface EnhancedNavigationItem {
  title: string;
  path: string;
  icon: string;
  moduleKey: ModuleName;
  description?: string;
  submenu?: EnhancedNavigationSubItem[];
}

interface EnhancedNavigationSubItem {
  title: string;
  path: string;
  icon: string;
  requiredLevel?: 'access' | 'admin';
}

const EnhancedSidebar: React.FC = () => {
  const location = useLocation();
  const { 
    user, 
    visibleModules, 
    hasModuleAccess, 
    hasAdminAccess, 
    getModuleLevel,
    loading, 
    debugInfo 
  } = useEnhancedPermissions();

  // Alle verfügbaren Module definiert
  const allNavigationItems: EnhancedNavigationItem[] = [
    {
      title: 'KI-Assistent',
      path: '/ai',
      icon: '🤖',
      moduleKey: 'ai',
      description: 'Chat-Assistenten und Dokumentenanalyse',
      submenu: [
        { title: 'Chat', path: '/ai/chat', icon: '💬' },
        { title: 'Dokumentenanalyse', path: '/ai/documents', icon: '📄' },
        { title: 'RAG-Suche', path: '/ai/search', icon: '🔍' },
        { title: 'Einstellungen', path: '/ai/settings', icon: '⚙️', requiredLevel: 'admin' }
      ]
    },
    {
      title: 'Support',
      path: '/support',
      icon: '🎧',
      moduleKey: 'support',
      description: 'Ticket-Management und Kundensupport',
      submenu: [
        { title: 'Alle Tickets', path: '/support/tickets', icon: '📋' },
        { title: 'Neues Ticket', path: '/support/create', icon: '➕' },
        { title: 'Meine Tickets', path: '/support/my-tickets', icon: '👤' },
        { title: 'Dashboard', path: '/support/dashboard', icon: '📊' },
        { title: 'Verwaltung', path: '/support/admin', icon: '⚙️', requiredLevel: 'admin' }
      ]
    },
    {
      title: 'Personal',
      path: '/hr',
      icon: '👥',
      moduleKey: 'hr',
      description: 'Human Resources Management',
      submenu: [
        { title: 'Mitarbeiter', path: '/hr/employees', icon: '👤' },
        { title: 'Onboarding', path: '/hr/onboarding', icon: '🎯' },
        { title: 'Berichte', path: '/hr/reports', icon: '📈' },
        { title: 'Statistiken', path: '/hr/stats', icon: '📊' },
        { title: 'Einstellungen', path: '/hr/settings', icon: '⚙️', requiredLevel: 'admin' }
      ]
    },
    {
      title: 'Admin-Portal',
      path: '/admin-portal',
      icon: '⚙️',
      moduleKey: 'admin_portal',
      description: 'System-Administration und User-Management',
      submenu: [
        { title: 'Dashboard', path: '/admin-portal/dashboard', icon: '📊' },
        { title: 'Benutzer-Verwaltung', path: '/admin-portal/users', icon: '👥' },
        { title: 'Berechtigungen', path: '/admin-portal/permissions', icon: '🔐' },
        { title: 'System-Settings', path: '/admin-portal/settings', icon: '⚙️' },
        { title: 'Audit-Logs', path: '/admin-portal/audit', icon: '📋', requiredLevel: 'admin' }
      ]
    }
  ];

  // Filter Module basierend auf User-Permissions
  const visibleNavigationItems = allNavigationItems.filter(item => 
    visibleModules.includes(item.moduleKey)
  );

  // Bestimme aktives Item
  const isPathActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Loading State
  if (loading) {
    return (
      <aside className="main-sidebar">
        <div className="sidebar-header">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Lade Module...</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="main-sidebar enhanced">
      <nav className="sidebar-nav">
        {/* Dashboard ist immer sichtbar */}
        <div className="nav-section">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link dashboard-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </NavLink>
        </div>

        {/* Dynamische Module */}
        <div className="nav-section">
          <h3 className="nav-title">Module ({visibleNavigationItems.length})</h3>
          {visibleNavigationItems.length === 0 ? (
            <div className="no-modules-message">
              <span className="icon">🚫</span>
              <span className="text">Keine Module verfügbar</span>
              <small>Kontaktieren Sie einen Administrator</small>
            </div>
          ) : (
            <ul className="nav-list">
              {visibleNavigationItems.map((item) => (
                <li key={item.moduleKey} className="nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => 
                      `nav-link ${isActive || isPathActive(item.path) ? 'active' : ''}`
                    }
                    title={item.description}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <div className="nav-content">
                      <span className="nav-text">{item.title}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                    
                    {/* Access Level Indicator */}
                    <div className="access-indicators">
                      {hasAdminAccess(item.moduleKey) ? (
                        <span className="access-badge admin" title="Administrator">👑</span>
                      ) : (
                        <span className="access-badge user" title="Basis-Zugriff">👤</span>
                      )}
                      <span className="access-level">{getModuleLevel(item.moduleKey)}</span>
                    </div>
                  </NavLink>
                  
                  {/* Submenu */}
                  {item.submenu && isPathActive(item.path) && (
                    <ul className="submenu">
                      {item.submenu.map((subItem) => (
                        <ModuleAccessGate
                          key={subItem.path}
                          module={item.moduleKey}
                          requiredLevel={subItem.requiredLevel || 'access'}
                          showLoader={false}
                        >
                          <li className="submenu-item">
                            <NavLink 
                              to={subItem.path} 
                              className={({ isActive }) => 
                                `submenu-link ${isActive ? 'active' : ''}`
                              }
                            >
                              <span className="submenu-icon">{subItem.icon}</span>
                              <span className="submenu-text">{subItem.title}</span>
                              {subItem.requiredLevel === 'admin' && (
                                <span className="admin-required" title="Admin-Berechtigung erforderlich">🔒</span>
                              )}
                            </NavLink>
                          </li>
                        </ModuleAccessGate>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* User Info Section */}
        <div className="nav-section user-section">
          <div className="user-info-card">
            <div className="user-avatar">
              {user?.email.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="user-details">
              <div className="user-name">
                {user?.email.split('@')[0] || 'Unbekannt'}
              </div>
              <div className="user-department">
                {user?.department || 'Keine Abteilung'}
              </div>
              <div className="user-stats">
                <span className="stat-item">
                  <span className="stat-icon">📊</span>
                  <span className="stat-text">{visibleModules.length} Module</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button 
              className="quick-action-btn"
              onClick={() => window.location.reload()}
              title="Permissions neu laden"
            >
              🔄
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }}
              title="Abmelden"
            >
              🚪
            </button>
          </div>

          {/* Collapsible Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <details className="debug-section">
              <summary className="debug-toggle">
                <span className="debug-icon">🔍</span>
                Debug Info
              </summary>
              <div className="debug-content">
                <EnhancedPermissionDebugInfo />
              </div>
            </details>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default EnhancedSidebar;
