import React, { useState, useEffect } from 'react';
import '../styles/PermissionsPages.css';

// Interfaces basierend auf Backend-Types
interface DepartmentInfo {
  id: string;
  name: string;
  userCount: number;
  subGroups: SubGroupInfo[];
  directUsers: UserInfo[];
  detectedFrom: 'department_parsing';
  hasPermissions: boolean;
}

interface SubGroupInfo {
  id: string;
  name: string;
  displayName: string;
  parentDepartment: string;
  userCount: number;
  users: UserInfo[];
  hasPermissions: boolean;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  source: 'entra' | 'manual' | 'ldap' | 'upload';
  hasIndividualOverrides: boolean;
}

interface DetectedHierarchy {
  departments: DepartmentInfo[];
  subGroups: SubGroupInfo[];
  analysisInfo: {
    totalUsers: number;
    rawDepartmentValues: string[];
    detectedAt: Date;
    parsingStats: {
      withPipe: number;
      withoutPipe: number;
      empty: number;
    };
  };
}

interface ModuleDefinition {
  key: string;
  name: string;
  icon: string;
  pages: PageDefinition[];
}

interface PageDefinition {
  key: string;
  name: string;
  icon: string;
  actions: ActionDefinition[];
}

interface ActionDefinition {
  key: string;
  name: string;
  description: string;
}

// type ModuleAccessLevel = 'none' | 'read' | 'write' | 'admin';

const HierarchyPage: React.FC = () => {
  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<DetectedHierarchy | null>(null);
  const [availableModules, setAvailableModules] = useState<ModuleDefinition[]>([]);
  
  // Selection States
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  // UI States
  const [activeTab, setActiveTab] = useState<'structure' | 'permissions' | 'users'>('structure');
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Parallel laden der Daten
      const [hierarchyResponse, modulesResponse] = await Promise.all([
        fetch('http://localhost:5000/api/admin-portal/hierarchy/analyze', { headers }),
        fetch('http://localhost:5000/api/admin-portal/hierarchy/modules', { headers })
      ]);

      if (!hierarchyResponse.ok || !modulesResponse.ok) {
        throw new Error('API-Fehler beim Laden der Daten');
      }

      const [hierarchyResult, modulesResult] = await Promise.all([
        hierarchyResponse.json(),
        modulesResponse.json()
      ]);

      if (hierarchyResult.success) {
        setHierarchy(hierarchyResult.data);
        // Auto-select erste Abteilung
        if (hierarchyResult.data.departments.length > 0) {
          setSelectedDepartment(hierarchyResult.data.departments[0].id);
        }
      } else {
        setError(hierarchyResult.message || 'Hierarchie-Analyse fehlgeschlagen');
      }

      if (modulesResult.success) {
        setAvailableModules(modulesResult.data);
      }

    } catch (err: any) {
      console.error('Fehler beim Laden der Hierarchy-Daten:', err);
      setError('Verbindungsfehler zum Backend');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDepartmentData = (): DepartmentInfo | undefined => {
    return hierarchy?.departments.find(d => d.id === selectedDepartment);
  };

  const getSelectedSubGroupData = (): SubGroupInfo | undefined => {
    const department = getSelectedDepartmentData();
    return department?.subGroups.find(sg => sg.id === selectedSubGroup);
  };

  const getAvailableUsers = (): UserInfo[] => {
    if (selectedSubGroup) {
      const subGroup = getSelectedSubGroupData();
      return subGroup?.users || [];
    }
    
    if (selectedDepartment) {
      const department = getSelectedDepartmentData();
      return department?.directUsers || [];
    }
    
    return [];
  };

  const renderDropdownSelection = () => {
    return (
      <div className="hierarchy-selector">
        <div className="selector-row">
          {/* Department Dropdown */}
          <div className="selector-field">
            <label>🏢 Abteilung:</label>
            <select 
              value={selectedDepartment} 
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedSubGroup(''); // Reset subgroup
                setSelectedUser(''); // Reset user
              }}
              className="dropdown"
            >
              <option value="">-- Abteilung wählen --</option>
              {hierarchy?.departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.userCount} Mitarbeiter)
                </option>
              ))}
            </select>
          </div>

          {/* SubGroup Dropdown */}
          {selectedDepartment && (
            <div className="selector-field">
              <label>📂 Untergruppe:</label>
              <select 
                value={selectedSubGroup} 
                onChange={(e) => {
                  setSelectedSubGroup(e.target.value);
                  setSelectedUser(''); // Reset user
                }}
                className="dropdown"
              >
                <option value="">-- Obergruppe ({getSelectedDepartmentData()?.name}) --</option>
                {getSelectedDepartmentData()?.subGroups.map(subGroup => (
                  <option key={subGroup.id} value={subGroup.id}>
                    {subGroup.displayName} ({subGroup.userCount} Mitarbeiter)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Dropdown */}
          {selectedDepartment && (
            <div className="selector-field">
              <label>👤 Benutzer:</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                className="dropdown"
              >
                <option value="">-- Alle Benutzer ({getAvailableUsers().length}) --</option>
                {getAvailableUsers().map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.jobTitle || 'Unbekannt'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selection Summary */}
        {selectedDepartment && (
          <div className="selection-summary">
            <div className="selection-path">
              <span className="path-item">🏢 {getSelectedDepartmentData()?.name}</span>
              {selectedSubGroup && (
                <>
                  <span className="path-separator">›</span>
                  <span className="path-item">📂 {getSelectedSubGroupData()?.displayName}</span>
                </>
              )}
              {selectedUser && (
                <>
                  <span className="path-separator">›</span>
                  <span className="path-item">👤 {getAvailableUsers().find(u => u.id === selectedUser)?.name}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPermissionMatrix = () => {
    if (!selectedDepartment) {
      return (
        <div className="empty-state">
          <p>👈 Wähle eine Abteilung aus, um Berechtigungen zu bearbeiten</p>
        </div>
      );
    }

    return (
      <div className="permission-matrix">
        <div className="matrix-header">
          <h3>🔐 Berechtigungen für: {getSelectedDepartmentData()?.name}</h3>
          {selectedSubGroup && (
            <p className="matrix-subtitle">
              Untergruppe: {getSelectedSubGroupData()?.displayName}
            </p>
          )}
        </div>

        <div className="modules-grid">
          {availableModules.map(module => (
            <div key={module.key} className="module-card">
              <div className="module-header">
                <h4>{module.icon} {module.name}</h4>
                <div className="access-level-selector">
                  <select className="access-dropdown">
                    <option value="none">🚫 Kein Zugriff</option>
                    <option value="read">👁️ Lesen</option>
                    <option value="write">✏️ Schreiben</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </div>
              </div>

              <div className="pages-list">
                {module.pages.map(page => (
                  <div key={page.key} className="page-item">
                    <div className="page-header">
                      <span className="page-name">{page.icon} {page.name}</span>
                      <select className="page-access-dropdown" disabled>
                        <option value="inherit">← Erben</option>
                      </select>
                    </div>
                    <div className="actions-grid">
                      {page.actions.map(action => (
                        <label key={action.key} className="action-checkbox">
                          <input 
                            type="checkbox" 
                            disabled 
                          />
                          <span>{action.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="matrix-actions">
          <button className="btn btn-primary">
            💾 Berechtigungen speichern
          </button>
          <button className="btn btn-secondary">
            🔄 Zurücksetzen
          </button>
          <button className="btn btn-outline">
            👀 Vorschau effektive Rechte
          </button>
        </div>
      </div>
    );
  };

  const renderStructureTab = () => {
    if (!hierarchy) return null;

    return (
      <div className="structure-overview">
        <div className="analysis-summary">
          <div className="summary-cards">
            <div className="summary-card">
              <h4>🏢 Abteilungen</h4>
              <div className="summary-value">{hierarchy.departments.length}</div>
            </div>
            <div className="summary-card">
              <h4>📂 Untergruppen</h4>
              <div className="summary-value">{hierarchy.subGroups.length}</div>
            </div>
            <div className="summary-card">
              <h4>👥 Benutzer gesamt</h4>
              <div className="summary-value">{hierarchy.analysisInfo.totalUsers}</div>
            </div>
            <div className="summary-card">
              <h4>📊 Mit "|" Format</h4>
              <div className="summary-value">{hierarchy.analysisInfo.parsingStats.withPipe}</div>
            </div>
          </div>

          <button 
            className="btn btn-outline"
            onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
          >
            {showAnalysisDetails ? '👁️ Details verbergen' : '🔍 Analyse-Details anzeigen'}
          </button>
        </div>

        {showAnalysisDetails && (
          <div className="analysis-details">
            <h4>📋 Raw Department Values:</h4>
            <div className="raw-values">
              {hierarchy.analysisInfo.rawDepartmentValues.map((value, index) => (
                <span key={index} className="raw-value-tag">
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="departments-tree">
          {hierarchy.departments.map(department => (
            <div key={department.id} className="department-node">
              <div className="department-header">
                <span className="department-icon">🏢</span>
                <span className="department-name">{department.name}</span>
                <span className="user-count">({department.userCount} Mitarbeiter)</span>
                {department.hasPermissions && (
                  <span className="permissions-badge">🔐 Konfiguriert</span>
                )}
              </div>

              {department.subGroups.length > 0 && (
                <div className="subgroups-list">
                  {department.subGroups.map(subGroup => (
                    <div key={subGroup.id} className="subgroup-node">
                      <span className="subgroup-icon">📂</span>
                      <span className="subgroup-name">{subGroup.displayName}</span>
                      <span className="user-count">({subGroup.userCount})</span>
                    </div>
                  ))}
                </div>
              )}

              {department.directUsers.length > 0 && (
                <div className="direct-users">
                  <span className="direct-users-label">👤 Direkt zugeordnet: {department.directUsers.length}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="hierarchy-page">
        <div className="page-header">
          <div className="page-title">
            <h1>🏗️ Hierarchische Berechtigungen</h1>
            <p>Abteilungs-basierte Rechteverwaltung</p>
          </div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Analysiere User-Hierarchie...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="hierarchy-page">
        <div className="page-header">
          <div className="page-title">
            <h1>🏗️ Hierarchische Berechtigungen</h1>
            <p>Abteilungs-basierte Rechteverwaltung</p>
          </div>
        </div>
        <div className="error-state">
          <h3>❌ Fehler</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadData}>
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hierarchy-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🏗️ Hierarchische Berechtigungen</h1>
          <p>Abteilungs-basierte Rechteverwaltung mit automatischer User-Hierarchie</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadData}>
            🔄 Hierarchie aktualisieren
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab ${activeTab === 'structure' ? 'active' : ''}`}
          onClick={() => setActiveTab('structure')}
        >
          🏗️ Struktur-Übersicht
        </button>
        <button 
          className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          🔐 Berechtigungen bearbeiten
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Benutzer-Übersicht
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'structure' && renderStructureTab()}
        
        {activeTab === 'permissions' && (
          <div className="permissions-tab">
            {renderDropdownSelection()}
            {renderPermissionMatrix()}
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="users-tab">
            {renderDropdownSelection()}
            <div className="users-list">
              {getAvailableUsers().length > 0 ? (
                <div className="users-grid">
                  {getAvailableUsers().map(user => (
                    <div key={user.id} className="user-card">
                      <div className="user-info">
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                        <p>{user.jobTitle || 'Unbekannt'}</p>
                      </div>
                      <div className="user-source">
                        <span className={`source-badge source-${user.source}`}>
                          {user.source}
                        </span>
                        {user.hasIndividualOverrides && (
                          <span className="override-badge">🎯 Individual</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>👈 Wähle eine Abteilung oder Untergruppe aus, um Benutzer zu sehen</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchyPage;
