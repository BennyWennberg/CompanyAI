// Enhanced Sidebar - Nutzt JSON-basierte Permissions
// Dynamische Module basierend auf department-permissions.json

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEnhancedPermissions, ModuleAccessGate, EnhancedPermissionDebugInfo, ModuleName } from '../../context/EnhancedPermissionContext';
import './Sidebar.css';

// Heroicons imports
import {
  ChartBarIcon,
  CpuChipIcon,
  ChatBubbleLeftIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  UserIcon,
  UsersIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  CogIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,

  PencilIcon,
  ShieldCheckIcon,
  ClipboardIcon,
  StarIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Navigation Item Interface für Enhanced System
interface EnhancedNavigationItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey: ModuleName;
  description?: string;
  submenu?: EnhancedNavigationSubItem[];
}

interface EnhancedNavigationSubItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
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
      icon: CpuChipIcon,
      moduleKey: 'ai',
      description: 'Chat-Assistenten und Dokumentenanalyse',
      submenu: [
        { title: 'Chat', path: '/ai/chat', icon: ChatBubbleLeftIcon },
        { title: 'Dokumente (Upload)', path: '/ai/docs', icon: DocumentIcon }
      ]
    },
    {
      title: 'Support',
      path: '/support',
      icon: ChatBubbleLeftRightIcon,
      moduleKey: 'support',
      description: 'Ticket-Management und Kundensupport',
      submenu: [
        { title: 'Alle Tickets', path: '/support/tickets', icon: ClipboardDocumentListIcon },
        { title: 'Neues Ticket', path: '/support/create', icon: PlusIcon },
        { title: 'Meine Tickets', path: '/support/my-tickets', icon: UserIcon },
        { title: 'Dashboard', path: '/support/dashboard', icon: ChartBarIcon },
        { title: 'Verwaltung', path: '/support/admin', icon: CogIcon, requiredLevel: 'admin' }
      ]
    },
    {
      title: 'Personal',
      path: '/hr',
      icon: UsersIcon,
      moduleKey: 'hr',
      description: 'Human Resources Management',
      submenu: [
        { title: 'Mitarbeiter', path: '/hr/employees', icon: UserIcon },
        { title: 'Onboarding', path: '/hr/onboarding', icon: AcademicCapIcon },
        { title: 'Berichte', path: '/hr/reports', icon: ArrowTrendingUpIcon },
        { title: 'Statistiken', path: '/hr/stats', icon: ChartBarIcon },
        { title: 'Einstellungen', path: '/hr/settings', icon: CogIcon, requiredLevel: 'admin' }
      ]
    },
    {
      title: 'Admin-Portal',
      path: '/admin-portal',
      icon: CogIcon,
      moduleKey: 'admin_portal',
      description: 'System-Administration und User-Management',
      submenu: [
        { title: 'Dashboard', path: '/admin-portal/system/dashboard', icon: ChartBarIcon },
        { title: 'Benutzer-Verwaltung', path: '/admin-portal/users', icon: UsersIcon },
        { title: 'Users Overview', path: '/admin-portal/users/overview', icon: UserIcon },
        { title: 'Sync Management', path: '/admin-portal/users/sync', icon: ArrowPathIcon, requiredLevel: 'admin' },
        { title: 'Upload', path: '/admin-portal/users/upload', icon: ArrowUpTrayIcon, requiredLevel: 'admin' },
        { title: 'Manual Users', path: '/admin-portal/users/manual', icon: PencilIcon, requiredLevel: 'admin' },
        { title: 'Conflicts', path: '/admin-portal/users/conflicts', icon: ExclamationTriangleIcon, requiredLevel: 'admin' },
        { title: 'Berechtigungen', path: '/admin-portal/permissions', icon: ShieldCheckIcon },
        { title: 'System-Statistiken', path: '/admin-portal/system/stats', icon: ComputerDesktopIcon },
        { title: 'RAG Status', path: '/admin-portal/system/rag', icon: MagnifyingGlassIcon, requiredLevel: 'admin' },
        { title: 'Security & Compliance', path: '/admin-portal/system/security', icon: ShieldCheckIcon, requiredLevel: 'admin' },
        { title: 'Logging', path: '/admin-portal/system/logging', icon: ClipboardIcon, requiredLevel: 'admin' }
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
            <ChartBarIcon className="nav-icon" />
            <span className="nav-text">Dashboard</span>
          </NavLink>
        </div>

        {/* Dynamische Module */}
        <div className="nav-section">
          <h3 className="nav-title">Module ({visibleNavigationItems.length})</h3>
          {visibleNavigationItems.length === 0 ? (
            <div className="no-modules-message">
              <ExclamationTriangleIcon className="icon" />
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
                    <item.icon className="nav-icon" />
                    <div className="nav-content">
                      <span className="nav-text">{item.title}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                    
                    {/* Access Level Indicator */}
                    <div className="access-indicators">
                      {hasAdminAccess(item.moduleKey) ? (
                        <StarIcon className="access-badge admin" title="Administrator" />
                      ) : (
                        <UserIcon className="access-badge user" title="Basis-Zugriff" />
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
                              <subItem.icon className="submenu-icon" />
                              <span className="submenu-text">{subItem.title}</span>

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
                  <ChartBarIcon className="stat-icon" />
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
              <ArrowPathIcon className="quick-action-icon" />
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }}
              title="Abmelden"
            >
              <ArrowRightOnRectangleIcon className="quick-action-icon" />
            </button>
          </div>

          {/* Collapsible Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <details className="debug-section">
              <summary className="debug-toggle">
                <MagnifyingGlassIcon className="debug-icon" />
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
