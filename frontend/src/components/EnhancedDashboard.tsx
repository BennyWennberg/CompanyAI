// Modern Customer-Focused Dashboard - Professional SaaS Experience
// Designed for business customers with trust and efficiency in mind

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEnhancedPermissions, ModuleAccessGate, ModuleName } from '../context/EnhancedPermissionContext';

// Enhanced Heroicons imports
import {
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  CogIcon,
  ChatBubbleLeftIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  AcademicCapIcon,
  ChartBarIcon,
  LockClosedIcon,
  StarIcon,
  BuildingOfficeIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  HandRaisedIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  SparklesIcon,
  TrophyIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

import './EnhancedDashboard.css';

// Enhanced Module Definition with customer-focused content
interface ModuleCard {
  name: ModuleName;
  title: string;
  description: string;
  customerBenefit: string; // What value does this bring?
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  quickActions: QuickAction[];
}

interface QuickAction {
  title: string;
  description: string;
  customerValue: string; // Why should customer use this?
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  requiredLevel?: 'access' | 'admin';
  isPrimary?: boolean; // Highlight most important actions
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

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Customer-focused module definitions
  const allModules: ModuleCard[] = [
    {
      name: 'ai',
      title: 'KI-Assistent',
      description: 'Intelligente Automatisierung für Ihren Arbeitsalltag',
      customerBenefit: 'Sparen Sie bis zu 60% Zeit bei Dokumentenanalyse und Recherche',
      icon: CpuChipIcon,
      color: 'module-ai',
      quickActions: [
        { 
          title: 'Neuer Chat', 
          description: 'Intelligenten Assistenten starten', 
          customerValue: 'Sofortige Antworten auf Ihre Fragen',
          icon: ChatBubbleLeftIcon, 
          path: '/ai/chat',
          isPrimary: true
        },
        { 
          title: 'Dokument analysieren', 
          description: 'PDF, Word & Excel intelligent auswerten', 
          customerValue: 'Automatische Zusammenfassungen in Sekunden',
          icon: DocumentIcon, 
          path: '/ai/upload'
        }
      ]
    },
    {
      name: 'support',
      title: 'Support',
      description: 'Professionelles Kundensupport-Management',
      customerBenefit: 'Verbessern Sie Ihre Kundenzufriedenheit um durchschnittlich 40%',
      icon: ChatBubbleLeftRightIcon,
      color: 'module-support',
      quickActions: [
        { 
          title: 'Neues Ticket', 
          description: 'Support-Anfrage schnell erstellen', 
          customerValue: 'Strukturierte Problemerfassung für bessere Lösungen',
          icon: PlusIcon, 
          path: '/support/create',
          isPrimary: true
        },
        { 
          title: 'Meine Tickets', 
          description: 'Übersicht Ihrer aktuellen Anfragen', 
          customerValue: 'Behalten Sie den Status all Ihrer Anliegen im Blick',
          icon: UserIcon, 
          path: '/support/my-tickets'
        }
      ]
    },
    {
      name: 'hr',
      title: 'Personal',
      description: 'Moderne Personalverwaltung und Mitarbeiterentwicklung',
      customerBenefit: 'Reduzieren Sie HR-Verwaltungsaufwand um bis zu 50%',
      icon: UsersIcon,
      color: 'module-hr',
      quickActions: [
        { 
          title: 'Mitarbeiterübersicht', 
          description: 'Alle Teammitglieder auf einen Blick', 
          customerValue: 'Zentrale Verwaltung aller Personalinformationen',
          icon: ClipboardDocumentListIcon, 
          path: '/hr/employees',
          isPrimary: true
        },
        { 
          title: 'Neues Onboarding', 
          description: 'Strukturierte Einarbeitung planen', 
          customerValue: 'Neue Mitarbeiter 3x schneller produktiv machen',
          icon: AcademicCapIcon, 
          path: '/hr/onboarding/new'
        }
      ]
    },
    {
      name: 'admin_portal',
      title: 'Administration',
      description: 'Zentrale System- und Benutzerverwaltung',
      customerBenefit: 'Vollständige Kontrolle und Sicherheit für Ihre Daten',
      icon: CogIcon,
      color: 'module-admin',
      quickActions: [
        { 
          title: 'Dashboard', 
          description: 'System-Übersicht und Metriken', 
          customerValue: 'Behalten Sie die Systemperformance im Blick',
          icon: ChartBarIcon, 
          path: '/admin-portal/dashboard',
          isPrimary: true
        },
        { 
          title: 'Benutzer verwalten', 
          description: 'Zugriffsrechte und Accounts verwalten', 
          customerValue: 'Sichere und effiziente Benutzerverwaltung',
          icon: UsersIcon, 
          path: '/admin-portal/users'
        }
      ]
    }
  ];

  // Filter modules based on permissions
  const visibleModuleCards = allModules.filter(module => 
    visibleModules.includes(module.name)
  );

  // Calculate user stats
  const getUserStats = () => {
    const moduleCount = visibleModules.length;
    const adminCount = visibleModules.filter(module => hasAdminAccess(module)).length;
    const accessLevel = adminCount > 0 ? 'Erweitert' : 'Standard';
    
    return {
      moduleCount,
      adminCount,
      accessLevel,
      productivity: Math.min(100, (moduleCount * 25) + (adminCount * 15))
    };
  };

  const userStats = getUserStats();

  // Loading State
  if (loading) {
    return (
      <div className="customer-dashboard loading-state">
        <div className="loading-container">
          <div className="loading-animation">
            <SparklesIcon className="loading-icon" />
            <div className="loading-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
          <h2 className="loading-title">Dashboard wird vorbereitet...</h2>
          <p className="loading-subtitle">Ihre Arbeitsumgebung wird personalisiert</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      {/* Hero Welcome Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="welcome-content">
            <div className="greeting-section">
              <h1 className="hero-title">
                Willkommen zurück, {user?.email.split('@')[0] || 'Geschätzter Kunde'}!
                <HandRaisedIcon className="greeting-icon" />
              </h1>
              <p className="hero-subtitle">Bereit für einen produktiven Tag?</p>
              
              {/* User Context */}
              <div className="user-context">
                {user?.department && (
                  <div className="context-item">
                    <BuildingOfficeIcon className="context-icon" />
                    <span className="context-text">{user.department}</span>
                  </div>
                )}
                <div className="context-item">
                  <ClockIcon className="context-icon" />
                  <span className="context-text">
                    {currentTime.toLocaleDateString('de-DE', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="hero-stats">
            <div className="stat-card primary">
              <div className="stat-icon-container">
                <BoltIcon className="stat-icon" />
              </div>
              <div className="stat-content">
                <div className="stat-number">{userStats.moduleCount}</div>
                <div className="stat-label">Verfügbare Module</div>
              </div>
            </div>
            
            <div className="stat-card success">
              <div className="stat-icon-container">
                <TrophyIcon className="stat-icon" />
              </div>
              <div className="stat-content">
                <div className="stat-number">{userStats.productivity}%</div>
                <div className="stat-label">Produktivität</div>
              </div>
            </div>
            
            <div className="stat-card info">
              <div className="stat-icon-container">
                <KeyIcon className="stat-icon" />
              </div>
              <div className="stat-content">
                <div className="stat-number">{userStats.accessLevel}</div>
                <div className="stat-label">Zugriffslevel</div>
              </div>
            </div>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="tip-container">
          <div className="tip-content">
            <SparklesIcon className="tip-icon" />
            <span className="tip-text">Tipp: Nutzen Sie die Schnellzugriffe für häufige Aktionen.</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* No Modules State */}
        {visibleModuleCards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon-container">
                <RocketLaunchIcon className="empty-icon" />
              </div>
              <h3 className="empty-title">Bereit für den Start!</h3>
              <p className="empty-description">
                Ihr Administrator richtet gerade Ihre Module ein.
                <br />
                In Kürze haben Sie Zugriff auf alle für Sie relevanten Bereiche.
              </p>
              <div className="empty-actions">
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  <CheckCircleIcon className="btn-icon" />
                  Status aktualisieren
                </button>
                <Link to="/support/create" className="btn btn-secondary">
                  Support kontaktieren
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Module Grid */}
            <div className="modules-section">
              <div className="section-header">
                <h2 className="section-title">Ihre Arbeitsbereiche</h2>
                <p className="section-subtitle">
                  Alles was Sie für einen effizienten Arbeitsalltag benötigen
                </p>
              </div>

              <div className="modules-grid">
                {visibleModuleCards.map((module) => {
                  const userLevel = getModuleLevel(module.name);
                  const isAdmin = userLevel === 'admin';
                  const primaryAction = module.quickActions.find(action => action.isPrimary);
                  
                  return (
                    <div key={module.name} className={`module-card ${module.color}`}>
                      {/* Module Header */}
                      <div className="module-header">
                        <div className="module-icon-wrapper">
                          <div className="module-icon-container">
                            <module.icon className="module-icon" />
                          </div>
                          <div className="permission-badge">
                            {isAdmin ? (
                              <StarIcon className="admin-badge" title="Administrator-Zugriff" />
                            ) : (
                              <CheckCircleIcon className="user-badge" title="Standard-Zugriff" />
                            )}
                          </div>
                        </div>
                        
                        <div className="module-info">
                          <h3 className="module-title">{module.title}</h3>
                          <p className="module-description">{module.description}</p>
                          <div className="module-benefit">
                            <BoltIcon className="benefit-icon" />
                            <span className="benefit-text">{module.customerBenefit}</span>
                          </div>
                        </div>
                      </div>

                      {/* Primary Action */}
                      {primaryAction && (
                        <div className="primary-action">
                          <ModuleAccessGate
                            module={module.name}
                            requiredLevel={primaryAction.requiredLevel || 'access'}
                            showLoader={false}
                          >
                            <Link 
                              to={primaryAction.path} 
                              className="primary-action-btn"
                              title={primaryAction.customerValue}
                            >
                              <primaryAction.icon className="action-icon" />
                              <div className="action-content">
                                <span className="action-title">{primaryAction.title}</span>
                                <span className="action-benefit">{primaryAction.customerValue}</span>
                              </div>
                              <ArrowRightIcon className="action-arrow" />
                            </Link>
                          </ModuleAccessGate>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="quick-actions">
                        <div className="actions-grid">
                          {module.quickActions
                            .filter(action => !action.isPrimary)
                            .filter(action => {
                              if (action.requiredLevel === 'admin') {
                                return hasAdminAccess(module.name);
                              }
                              return hasModuleAccess(module.name);
                            })
                            .slice(0, 4)
                            .map((action) => (
                              <ModuleAccessGate
                                key={action.path}
                                module={module.name}
                                requiredLevel={action.requiredLevel || 'access'}
                                showLoader={false}
                              >
                                <Link 
                                  to={action.path} 
                                  className="quick-action-item"
                                  title={action.customerValue}
                                >
                                  <action.icon className="quick-action-icon" />
                                  <span className="quick-action-title">{action.title}</span>
                                  {action.requiredLevel === 'admin' && (
                                    <LockClosedIcon className="admin-indicator" />
                                  )}
                                </Link>
                              </ModuleAccessGate>
                            ))}
                        </div>
                      </div>

                      {/* Module Footer */}
                      <div className="module-footer">
                        <Link 
                          to={`/${module.name.replace('_', '-')}`}
                          className="module-main-link"
                        >
                          <span>Zu {module.title}</span>
                          <ArrowRightIcon className="link-arrow" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* System Status Footer */}
        <footer className="dashboard-footer">
          <div className="footer-content">
            <div className="status-section">
              <div className="status-indicator online"></div>
              <div className="status-text">
                <span className="status-label">System Status: </span>
                <span className="status-value">Alle Systeme operational</span>
              </div>
            </div>
            
            <div className="update-info">
              <ClockIcon className="update-icon" />
              <span className="update-text">
                Letzte Aktualisierung: {currentTime.toLocaleTimeString('de-DE', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EnhancedDashboard;