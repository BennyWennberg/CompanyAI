import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions, PermissionDebugInfo } from '../../context/PermissionContext';
import './Sidebar.css';

// ===== 🔐 ECHTES PERMISSION SYSTEM - DEPARTMENT/USER BASIERT =====

// Navigation Item Interface
interface NavigationItem {
  title: string;
  path: string;
  icon: string;
  moduleKey: string;
  active?: boolean;
  submenu?: NavigationSubItem[];
}

interface NavigationSubItem {
  title: string;
  path: string;
  icon: string;
  submenu?: NavigationSubItem[]; // Support for nested submenus
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { hasModuleAccess, getModuleAccessLevel, loading, debugInfo, isAdmin } = usePermissions();

  const allNavigationItems: NavigationItem[] = [
    {
      title: 'Dashboard',
      path: '/',
      icon: '📊',
      moduleKey: 'dashboard', // Immer sichtbar
      active: location.pathname === '/'
    },
    {
      title: 'HR Module',
      path: '/hr',
      icon: '👥',
      moduleKey: 'hr',
      active: location.pathname.startsWith('/hr'),
      submenu: [
        { title: 'Mitarbeiter', path: '/hr/employees', icon: '👤' },
        { title: 'Onboarding', path: '/hr/onboarding', icon: '🎯' },
        { title: 'Berichte', path: '/hr/reports', icon: '📈' },
        { title: 'Statistiken', path: '/hr/stats', icon: '📊' }
      ]
    },
    {
      title: 'Support Module',
      path: '/support',
      icon: '🎫',
      moduleKey: 'support',
      active: location.pathname.startsWith('/support'),
      submenu: [
        { title: 'Tickets', path: '/support/tickets', icon: '📋' },
        { title: 'Neues Ticket', path: '/support/create', icon: '➕' },
        { title: 'Dashboard', path: '/support/dashboard', icon: '📊' }
      ]
    },
    {
      title: 'AI',
      path: '/ai',
      icon: '🤖',
      moduleKey: 'ai',
      active: location.pathname.startsWith('/ai'),
      submenu: [
        { title: 'Chat', path: '/ai/chat', icon: '💬' },
        { title: 'Dokumente', path: '/ai/docs', icon: '📚' }
      ]
    },
    {
      title: 'Admin-Portal',
      path: '/admin-portal',
      icon: '⚙️',
      moduleKey: 'admin-portal',
      active: location.pathname.startsWith('/admin-portal'),
      submenu: [
        { title: 'System', path: '/admin-portal/system/dashboard', icon: '🖥️' },
        { 
          title: 'Benutzer', 
          path: '/admin-portal/users/overview', 
          icon: '👥',
          submenu: [
            { title: 'Übersicht', path: '/admin-portal/users/overview', icon: '📊' },
            { title: 'Manuelle Benutzer', path: '/admin-portal/users/manual', icon: '👤' },
            { title: 'Sync-Verwaltung', path: '/admin-portal/users/sync', icon: '🔄' },
            { title: 'Upload', path: '/admin-portal/users/upload', icon: '📤' },
            { title: 'Konflikte', path: '/admin-portal/users/conflicts', icon: '⚠️' }
          ]
        },
        { title: 'Berechtigungen', path: '/admin-portal/permissions/hierarchy', icon: '🔐' }
      ]
    },
    {
      title: 'Einstellungen',
      path: '/settings',
      icon: '⚙️',
      moduleKey: 'settings',
      active: location.pathname.startsWith('/settings')
    }
  ];

  // 🚨 FILTER MODULE BASIEREND AUF ECHTEN USER-PERMISSIONS
  const navigationItems = allNavigationItems.filter((item) => {
    // Dashboard ist immer sichtbar
    if (item.moduleKey === 'dashboard') return true;
    
    // 👑 ADMINISTRATOR-BYPASS: Admin sieht alle Module
    if (isAdmin()) {
      console.log(`👑 ADMINISTRATOR-Bypass: Nav-Filter für ${item.moduleKey}: true (Admin sieht alles)`);
      return true;
    }
    
    // ✅ Normale User nutzen Admin-Portal Permissions
    const hasAccess = hasModuleAccess(item.moduleKey);
    const accessLevel = getModuleAccessLevel(item.moduleKey);
    
    // Debug-Ausgabe für Permission-Checks
    console.log(`🔍 Nav-Filter für ${item.moduleKey}: hasAccess=${hasAccess}, level=${accessLevel} (normaler User)`);
    
    // Module wird nur angezeigt wenn explizite Permission vom Admin-Portal kommt
    return hasAccess;
  });

  // Loading State
  if (loading) {
    return (
      <aside className="main-sidebar">
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
              🔄 Lade Berechtigungen...
            </div>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="main-sidebar">
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-title">Navigation</h3>
          <ul className="nav-list">
            {navigationItems.map((item) => (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive || item.active ? 'active' : ''}`
                  }
                  end={item.path === '/'}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.title}</span>
                  {/* 🔐 ACCESS LEVEL INDICATOR - Clean Design */}
                  {item.moduleKey !== 'dashboard' && (
                    <span className="access-indicator" title={isAdmin() ? 'Administrator - Vollzugriff' : `Zugriffslevel: ${getModuleAccessLevel(item.moduleKey)}`}>
                      {isAdmin() ? '👑' : (
                        getModuleAccessLevel(item.moduleKey) === 'admin' ? '⚡' :
                        getModuleAccessLevel(item.moduleKey) === 'write' ? '✏️' :
                        getModuleAccessLevel(item.moduleKey) === 'read' ? '👁️' : ''
                      )}
                    </span>
                  )}
                </NavLink>
                
                {/* Clean Submenu - Only show when expanded */}
                {item.submenu && item.active && (
                  <ul className="submenu level-0">
                    {item.submenu.map((subItem) => (
                      <li key={subItem.path} className="submenu-item">
                        <NavLink to={subItem.path} className="submenu-link">
                          <span className="submenu-icon">{subItem.icon}</span>
                          <span className="submenu-text">{subItem.title}</span>
                        </NavLink>
                        
                        {/* Nested Submenu Support - Level 2 */}
                        {subItem.submenu && location.pathname.startsWith(subItem.path.split('/').slice(0, -1).join('/')) && (
                          <ul className="submenu level-1">
                            {subItem.submenu.map((nestedItem) => (
                              <li key={nestedItem.path} className="submenu-item">
                                <NavLink to={nestedItem.path} className="submenu-link">
                                  <span className="submenu-icon">{nestedItem.icon}</span>
                                  <span className="submenu-text">{nestedItem.title}</span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 🔐 CLEAN USER INFO - Admin Status hervorgehoben */}
        <div className="nav-section nav-user-info" style={{ 
          marginTop: 'auto',
          background: isAdmin() ? 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,140,0,0.1) 100%)' : 'transparent',
          border: isAdmin() ? '1px solid rgba(255,215,0,0.3)' : 'none',
          borderRadius: '8px',
          padding: '16px'
        }}>
          {isAdmin() && (
            <div className="admin-badge">
              👑 ADMINISTRATOR
            </div>
          )}
          
          <div className="user-info">
            <div className="user-name">👤 {debugInfo.userEmail.split('@')[0] || 'Unknown'}</div>
            <div className="user-dept">🏢 {debugInfo.userDepartment.replace(' (Administrator)', '')}</div>
            <div className="user-modules">📊 {isAdmin() ? 'Alle Module' : `${debugInfo.totalModulesWithAccess} Module`}</div>
          </div>
          
          {/* Collapsible Debug Info */}
          <details className="debug-details">
            <summary>🔍 Debug</summary>
            <div className="debug-content">
              <PermissionDebugInfo />
            </div>
          </details>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;