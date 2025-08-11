import React, { useEffect, useState } from 'react';
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
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    // Lade System-Status
    fetchSystemStatus();
    fetchModuleStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Fehler beim Laden des System-Status:', error);
    }
  };

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

      {/* System Status */}
      <div className="dashboard-section">
        <h2>System Status</h2>
        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon">🚀</div>
            <div className="status-info">
              <h3>Backend</h3>
              <p className={`status-text ${systemStatus?.status === 'OK' ? 'active' : 'inactive'}`}>
                {systemStatus?.status === 'OK' ? 'Online' : 'Offline'}
              </p>
              <small>Port 5000</small>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🎨</div>
            <div className="status-info">
              <h3>Frontend</h3>
              <p className="status-text active">Online</p>
              <small>Port 5173</small>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🔐</div>
            <div className="status-info">
              <h3>Authentifizierung</h3>
              <p className="status-text active">Aktiv</p>
              <small>Token-basiert</small>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">📊</div>
            <div className="status-info">
              <h3>API-Endpunkte</h3>
              <p className="status-text active">11 Aktiv</p>
              <small>HR: 8, Support: 3</small>
            </div>
          </div>
        </div>
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
                    onClick={() => window.location.href = `/${module.name.toLowerCase().split(' ')[0]}`}
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
            onClick={() => window.location.href = '/hr/employees'}
          >
            <div className="quick-icon">👤</div>
            <span>Mitarbeiter verwalten</span>
          </button>
          
          <button 
            className="quick-action-btn support"
            onClick={() => window.location.href = '/support/tickets'}
          >
            <div className="quick-icon">📋</div>
            <span>Support Tickets</span>
          </button>
          
          <button 
            className="quick-action-btn hr"
            onClick={() => window.location.href = '/hr/reports'}
          >
            <div className="quick-icon">📈</div>
            <span>HR Berichte</span>
          </button>
          
          <button 
            className="quick-action-btn general"
            onClick={() => window.open('http://localhost:5000/api/hello', '_blank')}
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
