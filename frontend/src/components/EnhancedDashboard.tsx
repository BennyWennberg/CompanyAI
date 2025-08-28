// Enhanced Dashboard - Dynamische Module basierend auf JSON-Permissions
// Zeigt nur Module und Quick-Actions die der User verwenden darf

import React from 'react';
import { Link } from 'react-router-dom';
import { useEnhancedPermissions, ModuleAccessGate, ModuleName } from '../context/EnhancedPermissionContext';

// Module Definition
interface ModuleCard {
  name: ModuleName;
  title: string;
  description: string;
  icon: string;
  color: string;
  quickActions: QuickAction[];
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  path: string;
  requiredLevel?: 'access' | 'admin';
}

const EnhancedDashboard: React.FC = () => {
  const { 
    user, 
    visibleModules, 
    hasModuleAccess, 
    hasAdminAccess, 
    getModuleLevel,
    loading 
  } = useEnhancedPermissions();

  // Alle verfügbaren Module mit Quick-Actions
  const allModules: ModuleCard[] = [
    {
      name: 'ai',
      title: 'KI-Assistent',
      description: 'Chat-Assistenten und intelligente Dokumentenanalyse',
      icon: '🤖',
      color: 'bg-purple-500',
      quickActions: [
        { title: 'Neuer Chat', description: 'Starte eine Unterhaltung', icon: '💬', path: '/ai/chat' },
        { title: 'Dokument analysieren', description: 'Lade ein Dokument hoch', icon: '📄', path: '/ai/upload' },
        { title: 'RAG-Suche', description: 'Durchsuche Wissensbasis', icon: '🔍', path: '/ai/search' },
        { title: 'KI-Einstellungen', description: 'Modelle konfigurieren', icon: '⚙️', path: '/ai/settings', requiredLevel: 'admin' }
      ]
    },
    {
      name: 'support',
      title: 'Support',
      description: 'Ticket-Management und Kundensupport-System',
      icon: '🎧',
      color: 'bg-blue-500',
      quickActions: [
        { title: 'Neues Ticket', description: 'Support-Anfrage erstellen', icon: '➕', path: '/support/create' },
        { title: 'Meine Tickets', description: 'Eigene Tickets anzeigen', icon: '👤', path: '/support/my-tickets' },
        { title: 'Alle Tickets', description: 'Ticket-Übersicht', icon: '📋', path: '/support/tickets' },
        { title: 'Support-Admin', description: 'Verwaltung und Einstellungen', icon: '⚙️', path: '/support/admin', requiredLevel: 'admin' }
      ]
    },
    {
      name: 'hr',
      title: 'Personal',
      description: 'Human Resources und Mitarbeiterverwaltung',
      icon: '👥',
      color: 'bg-green-500',
      quickActions: [
        { title: 'Mitarbeiter-Liste', description: 'Alle Mitarbeiter anzeigen', icon: '📋', path: '/hr/employees' },
        { title: 'Neues Onboarding', description: 'Einarbeitungsplan erstellen', icon: '🎯', path: '/hr/onboarding/new' },
        { title: 'HR-Berichte', description: 'Statistiken und Reports', icon: '📈', path: '/hr/reports' },
        { title: 'HR-Einstellungen', description: 'System-Konfiguration', icon: '⚙️', path: '/hr/settings', requiredLevel: 'admin' }
      ]
    },
    {
      name: 'admin_portal',
      title: 'Admin-Portal',
      description: 'System-Administration und Benutzerverwaltung',
      icon: '⚙️',
      color: 'bg-red-500',
      quickActions: [
        { title: 'User-Dashboard', description: 'Benutzer-Übersicht', icon: '📊', path: '/admin-portal/dashboard' },
        { title: 'Benutzer verwalten', description: 'User hinzufügen/bearbeiten', icon: '👥', path: '/admin-portal/users' },
        { title: 'Berechtigungen', description: 'Rechte-Management', icon: '🔐', path: '/admin-portal/permissions' },
        { title: 'System-Settings', description: 'Globale Einstellungen', icon: '⚙️', path: '/admin-portal/settings' },
        { title: 'Audit-Logs', description: 'System-Protokolle', icon: '📋', path: '/admin-portal/audit', requiredLevel: 'admin' }
      ]
    }
  ];

  // Filter Module basierend auf sichtbaren Modulen
  const visibleModuleCards = allModules.filter(module => 
    visibleModules.includes(module.name)
  );

  // Loading State
  if (loading) {
    return (
      <div className="enhanced-dashboard loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Dashboard wird geladen...</h2>
          <p>Berechtigungen werden überprüft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title">
            Willkommen zurück, {user?.email.split('@')[0] || 'User'}! 👋
          </h1>
          <p className="dashboard-subtitle">
            Du hast Zugriff auf <strong>{visibleModules.length}</strong> Module
            {user?.department && (
              <span className="department-badge">
                🏢 {user.department}
              </span>
            )}
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{visibleModules.length}</div>
              <div className="stat-label">Module</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔑</div>
            <div className="stat-content">
              <div className="stat-number">
                {visibleModules.filter(module => hasAdminAccess(module)).length}
              </div>
              <div className="stat-label">Admin-Rechte</div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      {visibleModuleCards.length === 0 ? (
        <div className="no-modules-container">
          <div className="no-modules-content">
            <div className="no-modules-icon">🚫</div>
            <h2>Keine Module verfügbar</h2>
            <p>
              Du hast derzeit keinen Zugriff auf Module. 
              <br />
              Kontaktiere einen Administrator für weitere Berechtigungen.
            </p>
          </div>
        </div>
      ) : (
        <div className="modules-grid">
          {visibleModuleCards.map((module) => {
            const userLevel = getModuleLevel(module.name);
            const isAdmin = userLevel === 'admin';
            
            return (
              <div key={module.name} className={`module-card ${module.color}`}>
                <div className="module-header">
                  <div className="module-icon-container">
                    <span className="module-icon">{module.icon}</span>
                    <div className="permission-indicator">
                      {isAdmin ? (
                        <span className="admin-badge" title="Administrator">👑</span>
                      ) : (
                        <span className="user-badge" title="Basis-Zugriff">👤</span>
                      )}
                    </div>
                  </div>
                  <div className="module-info">
                    <h3 className="module-title">{module.title}</h3>
                    <p className="module-description">{module.description}</p>
                    <span className="access-level-badge">{userLevel}</span>
                  </div>
                </div>

                <div className="quick-actions">
                  <h4 className="quick-actions-title">Schnellzugriffe</h4>
                  <div className="action-buttons">
                    {module.quickActions
                      .filter(action => {
                        // Filter actions basierend auf Required Level
                        if (action.requiredLevel === 'admin') {
                          return hasAdminAccess(module.name);
                        }
                        return hasModuleAccess(module.name);
                      })
                      .map((action) => (
                        <ModuleAccessGate
                          key={action.path}
                          module={module.name}
                          requiredLevel={action.requiredLevel || 'access'}
                          showLoader={false}
                        >
                          <Link 
                            to={action.path} 
                            className="action-button"
                            title={action.description}
                          >
                            <span className="action-icon">{action.icon}</span>
                            <span className="action-title">{action.title}</span>
                            {action.requiredLevel === 'admin' && (
                              <span className="admin-indicator">🔒</span>
                            )}
                          </Link>
                        </ModuleAccessGate>
                      ))}
                  </div>
                </div>

                {/* Module Link */}
                <div className="module-footer">
                  <Link 
                    to={`/${module.name.replace('_', '-')}`}
                    className="module-main-link"
                  >
                    Zu {module.title} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* System Status */}
      <div className="dashboard-footer">
        <div className="system-status">
          <span className="status-indicator online"></span>
          <span className="status-text">System online</span>
          <span className="status-time">
            Letzte Aktualisierung: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
