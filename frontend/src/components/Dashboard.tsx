import React, { useEffect, useState } from 'react';
import { openApiDocs, navigateToRoute } from '../utils/browserUtils';
import './Dashboard.css';

interface ModuleStatus {
  name: string;
  status: 'active' | 'inactive' | 'planned';
  description: string;
  endpoints: number;
  lastUpdate: string;
}

const Dashboard: React.FC = () => {
  const [modules, setModules] = useState<ModuleStatus[]>([]);

  useEffect(() => {
    fetchModuleStatus();
  }, []);

  const fetchModuleStatus = () => {
    const moduleData: ModuleStatus[] = [
      {
        name: 'HR Module',
        status: 'active',
        description: 'Human Resources Management - Vollständig implementiert',
        endpoints: 8,
        lastUpdate: '8. Dezember 2024'
      },
      {
        name: 'Support Module',
        status: 'active',
        description: 'Customer Support & Ticket Management - Basis implementiert',
        endpoints: 3,
        lastUpdate: '8. Dezember 2024'
      },
      {
        name: 'AI Module',
        status: 'active',
        description: 'AI Chat & RAG-gestützte Assistenten (OpenWebUI)',
        endpoints: 3,
        lastUpdate: '8. Dezember 2024'
      },
      {
        name: 'Admin-Portal',
        status: 'active',
        description: 'Multi-Source User-Integration (Entra, LDAP, Upload, Manual)',
        endpoints: 48,
        lastUpdate: '14. Dezember 2024'
      },
      {
        name: 'Produktion Module',
        status: 'planned',
        description: 'Fertigungsprozesse und Qualitätskontrolle - Geplant',
        endpoints: 0,
        lastUpdate: 'Geplant für Q1 2025'
      }
    ];
    setModules(moduleData);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>CompanyAI Dashboard</h1>
        <p>Modulbasierte Unternehmens-KI - System-Übersicht</p>
      </div>



      {/* Module Overview */}
      <div className="dashboard-section">
        <h2>Module Übersicht</h2>
        <div className="modules-grid">
          {modules.map((module, index) => (
            <div key={index} className={`module-card ${module.status}`}>
              <div className="module-header">
                <div className="module-icon">
                  {module.name.includes('HR') && '👥'}
                  {module.name.includes('Support') && '🎫'}
                  {module.name.includes('AI') && '🤖'}
                  {module.name.includes('Admin-Portal') && '🏢'}
                  {module.name.includes('Produktion') && '🏭'}
                </div>
                <div className="module-status-badge">
                  <span className={`status-indicator ${module.status}`}></span>
                  {module.status === 'active' && 'Aktiv'}
                  {module.status === 'inactive' && 'Inaktiv'}
                  {module.status === 'planned' && 'Geplant'}
                </div>
              </div>
              
              <h3>{module.name}</h3>
              <p>{module.description}</p>
              
              <div className="module-stats">
                <div className="stat">
                  <span className="stat-label">Endpunkte:</span>
                  <span className="stat-value">{module.endpoints}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Status:</span>
                  <span className="stat-value">{module.lastUpdate}</span>
                </div>
              </div>
              
              {module.status === 'active' && (
                <div className="module-actions">
                  <button 
                    className="action-btn primary"
                    onClick={() => {
                      if (module.name === 'Admin-Portal') {
                        navigateToRoute('/admin-portal');
                      } else {
                        navigateToRoute(`/${module.name.toLowerCase().split(' ')[0]}`);
                      }
                    }}
                  >
                    Modul öffnen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Schnellzugriff</h2>
        <div className="quick-actions">
          <button 
            className="quick-action-btn hr"
            onClick={() => navigateToRoute('/hr/employees')}
          >
            <div className="quick-icon">👤</div>
            <span>Mitarbeiter verwalten</span>
          </button>
          
          <button 
            className="quick-action-btn support"
            onClick={() => navigateToRoute('/support/tickets')}
          >
            <div className="quick-icon">📋</div>
            <span>Support Tickets</span>
          </button>
          
          <button 
            className="quick-action-btn hr"
            onClick={() => navigateToRoute('/hr/reports')}
          >
            <div className="quick-icon">📈</div>
            <span>HR Berichte</span>
          </button>
          
          <button 
            className="quick-action-btn admin"
            onClick={() => navigateToRoute('/admin-portal/dashboard')}
          >
            <div className="quick-icon">🏢</div>
            <span>Admin-Portal</span>
          </button>
          
          <button 
            className="quick-action-btn general"
            onClick={openApiDocs}
          >
            <div className="quick-icon">📚</div>
            <span>API Dokumentation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
