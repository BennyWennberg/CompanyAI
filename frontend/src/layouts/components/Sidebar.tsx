import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

// ===== 🔐 PERMISSION SYSTEM - 3-STUFIGE HIERARCHIE =====

interface PermissionConfig {
  modules: Record<string, { visible: boolean; }>;
  pages: Record<string, { visible: boolean; actions: string[]; }>;
}

// ROLLE-BASIERTE PERMISSION-CONFIGURATION
const ROLE_PERMISSIONS: Record<string, PermissionConfig> = {
  'admin': {
    modules: {
      'hr': { visible: true },
      'support': { visible: true },
      'ai': { visible: true },
      'admin-portal': { visible: true },
      'settings': { visible: true }
    },
    pages: {
      'hr.employees': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'hr.onboarding': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'hr.reports': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'hr.stats': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'support.tickets': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'support.create': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'support.dashboard': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'ai.chat': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'ai.docs': { visible: true, actions: ['read', 'write', 'delete', 'create'] },
      'admin-portal.*': { visible: true, actions: ['read', 'write', 'delete', 'create', 'admin'] }
    }
  },
  'hr_manager': {
    modules: {
      'hr': { visible: true },
      'support': { visible: false },  // ❌ KOMPLETT UNSICHTBAR
      'ai': { visible: true },
      'admin-portal': { visible: false }, // ❌ KOMPLETT UNSICHTBAR
      'settings': { visible: true }
    },
    pages: {
      'hr.employees': { visible: true, actions: ['read', 'write', 'create'] }, // Kein delete
      'hr.onboarding': { visible: true, actions: ['read', 'write', 'create'] },
      'hr.reports': { visible: true, actions: ['read', 'write', 'create'] },
      'hr.stats': { visible: true, actions: ['read', 'write'] }, // Kein create/delete
      'ai.chat': { visible: true, actions: ['read', 'write'] },
      'ai.docs': { visible: false, actions: [] } // ❌ AI-Docs unsichtbar
    }
  },
  'hr_specialist': {
    modules: {
      'hr': { visible: true },
      'support': { visible: false },  // ❌ KOMPLETT UNSICHTBAR
      'ai': { visible: true },
      'admin-portal': { visible: false }, // ❌ KOMPLETT UNSICHTBAR
      'settings': { visible: false } // ❌ KOMPLETT UNSICHTBAR
    },
    pages: {
      'hr.employees': { visible: true, actions: ['read', 'write'] }, // Nur read/write
      'hr.onboarding': { visible: true, actions: ['read', 'write', 'create'] },
      'hr.reports': { visible: false, actions: [] }, // ❌ Reports unsichtbar
      'hr.stats': { visible: false, actions: [] },   // ❌ Stats unsichtbar
      'ai.chat': { visible: true, actions: ['read'] }, // Nur lesen
      'ai.docs': { visible: false, actions: [] } // ❌ AI-Docs unsichtbar
    }
  }
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  
  // 🔐 PERMISSION-CHECKER FUNCTIONS
  const getCurrentUserRole = (): string => {
    return localStorage.getItem('userRole') || 'guest';
  };

  const hasModuleAccess = (moduleKey: string): boolean => {
    const userRole = getCurrentUserRole();
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions?.modules[moduleKey]?.visible ?? false;
  };

  const hasPageAccess = (pageKey: string): boolean => {
    const userRole = getCurrentUserRole();
    const permissions = ROLE_PERMISSIONS[userRole];
    
    // 🔍 Exakter Match zuerst prüfen
    if (permissions?.pages[pageKey]?.visible) {
      return true;
    }
    
    // 🌟 WILDCARD-SUPPORT: Prüfe ob es einen Wildcard-Match gibt (admin-portal.*)
    const pageKeyPrefix = pageKey.split('.')[0]; // z.B. "admin-portal"
    const wildcardKey = `${pageKeyPrefix}.*`;
    return permissions?.pages[wildcardKey]?.visible ?? false;
  };

  // 🔐 PERMISSION-FILTERED SUBMENU RENDERER
  const renderSubmenu = (items: any[], level: number = 0, parentModule: string = '') => {
    // Filter Submenu-Items basierend auf Page-Permissions
    const filteredItems = items.filter((subItem) => {
      const pageKey = `${parentModule}.${subItem.path.split('/').pop()}`;
      const hasAccess = hasPageAccess(pageKey);
      
      // 🐛 DEBUG: Admin Portal Submenu Filtering
      if (parentModule === 'admin-portal') {
        console.log(`🔍 Admin Portal Debug: ${pageKey} -> ${hasAccess ? '✅ VISIBLE' : '❌ FILTERED'}`);
      }
      
      return hasAccess;
    });

    if (filteredItems.length === 0) return null; // Keine sichtbaren Items

    return (
      <ul className={`submenu level-${level}`}>
        {filteredItems.map((subItem) => (
          <li key={subItem.path} className="submenu-item">
            <NavLink
              to={subItem.path}
              className={({ isActive }) => 
                `submenu-link ${isActive ? 'active' : ''} ${subItem.submenu ? 'has-submenu' : ''}`
              }
            >
              <span className="submenu-icon">{subItem.icon}</span>
              <span className="submenu-text">{subItem.title}</span>
            </NavLink>
            
            {subItem.submenu && location.pathname.startsWith(subItem.path) && (
              renderSubmenu(subItem.submenu, level + 1, parentModule)
            )}
          </li>
        ))}
      </ul>
    );
  };

  // 🔐 PERMISSION-BASIERTE NAVIGATION ITEMS - MIT MODULE-KEYS
  const allNavigationItems = [
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
      icon: '🏢',
      moduleKey: 'admin-portal',
      active: location.pathname.startsWith('/admin-portal'),
      submenu: [
        {
          title: 'System',
          path: '/admin-portal/system',
          icon: '📊',
          submenu: [
            { title: 'Dashboard', path: '/admin-portal/system/dashboard', icon: '📊' },
            { title: 'Statistiken', path: '/admin-portal/system/stats', icon: '📈' },
            { title: 'Datenbank', path: '/admin-portal/system/database', icon: '🗄️' }
          ]
        },
        {
          title: 'Benutzer',
          path: '/admin-portal/users',
          icon: '👥',
          submenu: [
            { title: 'Übersicht', path: '/admin-portal/users/overview', icon: '👥' },
            { title: 'Synchronisation', path: '/admin-portal/users/sync', icon: '🔄' },
            { title: 'Upload', path: '/admin-portal/users/upload', icon: '📤' },
            { title: 'Manuell', path: '/admin-portal/users/manual', icon: '✋' },
            { title: 'Konflikte', path: '/admin-portal/users/conflicts', icon: '⚠️' }
          ]
        },
        {
          title: 'Rechte',
          path: '/admin-portal/permissions',
          icon: '🔐',
          submenu: [
            { title: 'Hierarchische Rechte', path: '/admin-portal/permissions/hierarchy', icon: '🏗️' },
            { title: 'Rollen', path: '/admin-portal/permissions/roles', icon: '👑' },
            { title: 'Gruppen', path: '/admin-portal/permissions/groups', icon: '👥' },
            { title: 'API-Tokens', path: '/admin-portal/permissions/tokens', icon: '🎫' },
            { title: 'Audit-Logs', path: '/admin-portal/permissions/audit', icon: '📋' }
          ]
        }
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

  // 🚨 FILTER MODULE BASIEREND AUF USER-PERMISSIONS
  const navigationItems = allNavigationItems.filter((item) => {
    // Dashboard ist immer sichtbar
    if (item.moduleKey === 'dashboard') return true;
    
    // Prüfe Module-Permission
    return hasModuleAccess(item.moduleKey);
  });

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
                </NavLink>
                
                {/* 🔐 PERMISSION-FILTERED SUBMENU MIT MODULE-KEY */}
                {item.submenu && item.active && renderSubmenu(item.submenu, 0, item.moduleKey)}
              </li>
            ))}
          </ul>
        </div>

        {/* 🔐 DEBUG INFO - Aktueller User & Role */}
        <div className="nav-section" style={{ marginTop: 'auto', padding: '16px', fontSize: '12px', color: '#9ca3af' }}>
          <div>👤 {localStorage.getItem('userName') || 'Unknown'}</div>
          <div>🎭 {getCurrentUserRole()}</div>
          <div>📊 Module: {navigationItems.length}</div>
        </div>
      </nav>
    </aside>
  );
};

// 🔐 EXPORT PERMISSION FUNCTIONS FOR OTHER COMPONENTS
export const usePermissions = () => {
  const getCurrentUserRole = (): string => {
    return localStorage.getItem('userRole') || 'guest';
  };

  const hasModuleAccess = (moduleKey: string): boolean => {
    const userRole = getCurrentUserRole();
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions?.modules[moduleKey]?.visible ?? false;
  };

  const hasPageAccess = (pageKey: string): boolean => {
    const userRole = getCurrentUserRole();
    const permissions = ROLE_PERMISSIONS[userRole];
    
    // 🔍 Exakter Match zuerst prüfen
    if (permissions?.pages[pageKey]?.visible) {
      return true;
    }
    
    // 🌟 WILDCARD-SUPPORT: Prüfe ob es einen Wildcard-Match gibt (admin-portal.*)
    const pageKeyPrefix = pageKey.split('.')[0]; // z.B. "admin-portal"
    const wildcardKey = `${pageKeyPrefix}.*`;
    return permissions?.pages[wildcardKey]?.visible ?? false;
  };

  const hasActionAccess = (pageKey: string, action: string): boolean => {
    const userRole = getCurrentUserRole();
    const permissions = ROLE_PERMISSIONS[userRole];
    const pagePermissions = permissions?.pages[pageKey];
    return pagePermissions?.actions.includes(action) ?? false;
  };

  return {
    getCurrentUserRole,
    hasModuleAccess,
    hasPageAccess,
    hasActionAccess
  };
};

export default Sidebar;
