import React, { useState, useEffect } from 'react';
import '../styles/HRPages.css';
import { useEnhancedPermissions } from '../../../context/EnhancedPermissionContext';
import SchemaManagerModal from '../components/SchemaManagerModal';
import AdditionalInfoEditor from '../components/AdditionalInfoEditor';

// Combined User aus DataSources (Entra + Manuell)
interface CombinedUser {
  id: string;
  displayName: string;
  userPrincipalName?: string;
  mail?: string;
  department?: string;
  jobTitle?: string;
  accountEnabled?: boolean;
  source: 'entra' | 'manual';
  createdDateTime?: string;
  // Persönliche Informationen
  givenName?: string;
  surname?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  // Organisatorische Informationen
  companyName?: string;
  employeeId?: string;
  costCenter?: string;
  division?: string;
  manager?: {
    id: string;
    displayName: string;
  };
}

interface HRDocument {
  id: string;
  fileName: string;
  category: string;
  fileType: string;
  fileSize: string;
  uploadDate: Date;
  filePath: string;
  employeeId: string;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const EmployeesPage: React.FC = () => {
  // 🔐 PERMISSION HOOKS
  const { hasModuleAccess, hasAdminAccess } = useEnhancedPermissions();
  
  // Helper functions for compatibility with old permission system
  const hasMinimumAccess = (level: 'access' | 'admin' | 'write') => {
    if (level === 'access' || level === 'write') return hasModuleAccess('hr');
    if (level === 'admin') return hasAdminAccess('hr');
    return false;
  };
  
  const isAdmin = () => hasAdminAccess('hr');
  
  const [employees, setEmployees] = useState<CombinedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<CombinedUser | null>(null);
  const [filters, setFilters] = useState({
    department: '',
    source: '',
    search: ''
  });
  
  // Document Management States
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  
  // Schema Management States
  const [schemaManagerOpen, setSchemaManagerOpen] = useState(false);
  const [additionalInfoEditorOpen, setAdditionalInfoEditorOpen] = useState(false);
  const [additionalInfoFields, setAdditionalInfoFields] = useState<any[]>([]);
  
  // Directory Sync States
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
    // Auto-sync DataSources on component mount if no employees found
    const autoSync = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Check if we have employees, if not, auto-sync
          const response = await fetch('http://localhost:5000/api/hr/employees?limit=1', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          const result = await response.json();
          
          if (result.success && result.data) {
            let employeeCount = 0;
            if (Array.isArray(result.data)) {
              employeeCount = result.data.length;
            } else if (result.data && typeof result.data === 'object' && 'pagination' in result.data) {
              employeeCount = result.data.pagination.total;
            }
            
            // If no employees found, auto-sync DataSources
            if (employeeCount === 0) {
              console.log('🔄 No employees found, auto-syncing DataSources...');
              await syncDataSources();
            }
          }
        }
      } catch (error) {
        console.log('Auto-sync check failed:', error);
      }
    };
    
    // Run auto-sync after initial load
    setTimeout(autoSync, 1000);
  }, []);

  // Load documents and additional info when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      loadDocuments(selectedEmployee.id);
      loadAdditionalInfo(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Keine Authentifizierung gefunden');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/hr/employees?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: APIResponse<PaginatedResponse<CombinedUser> | CombinedUser[]> = await response.json();

      if (result.success && result.data) {
        // Handle both paginated response and direct array response
        if (Array.isArray(result.data)) {
          // Direct array response (legacy)
          setEmployees(result.data);
        } else if (result.data && typeof result.data === 'object' && 'data' in result.data) {
          // Paginated response (current API format)
          const paginatedData = result.data as PaginatedResponse<CombinedUser>;
          setEmployees(paginatedData.data);
          console.log(`📊 HR: Loaded ${paginatedData.data.length} of ${paginatedData.pagination.total} employees`);
        } else {
          setError('Unerwartetes Datenformat vom Server');
        }
      } else {
        setError(result.message || result.error || 'Fehler beim Laden der Mitarbeiter');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Mitarbeiter:', err);
    } finally {
      setLoading(false);
    }
  };

  // Additional Info Management
  const loadAdditionalInfo = async (employeeId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}/additional-info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setAdditionalInfoFields(result.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zusatzinformationen:', error);
    }
  };

  // Directory Synchronization
  const syncDirectoryStructure = async () => {
    try {
      setSyncLoading(true);
      setSyncStatus('Synchronisiere Ordnerstruktur...');

      const token = localStorage.getItem('authToken');
      if (!token) {
        setSyncStatus('❌ Keine Authentifizierung gefunden');
        return;
      }

      const response = await fetch('http://localhost:5000/api/hr/directories/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        const { created, skipped, errors } = result.data;
        setSyncStatus(`✅ Synchronisation abgeschlossen: ${created} erstellt, ${skipped} übersprungen, ${errors} Fehler`);
        
        // Automatically clear status after 5 seconds
        setTimeout(() => {
          setSyncStatus(null);
        }, 5000);
      } else {
        setSyncStatus(`❌ ${result.message || 'Synchronisation fehlgeschlagen'}`);
        setTimeout(() => {
          setSyncStatus(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Fehler bei der Ordner-Synchronisation:', error);
      setSyncStatus('❌ Verbindungsfehler bei der Synchronisation');
      setTimeout(() => {
        setSyncStatus(null);
      }, 5000);
    } finally {
      setSyncLoading(false);
    }
  };

  // DataSources Synchronization
  const syncDataSources = async () => {
    try {
      setSyncLoading(true);
      setSyncStatus('Synchronisiere Benutzer-Datenquellen...');

      const token = localStorage.getItem('authToken');
      if (!token) {
        setSyncStatus('❌ Keine Authentifizierung gefunden');
        return;
      }

      const response = await fetch('http://localhost:5000/api/hr/sync-datasources', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        const { entra, manual, ldap, upload, total } = result.data;
        setSyncStatus(`✅ DataSources synchronisiert: ${total} User total (Entra: ${entra}, Manual: ${manual}, LDAP: ${ldap}, Upload: ${upload})`);
        
        // Reload employees after sync
        await loadEmployees();
        
        // Clear status after 5 seconds
        setTimeout(() => {
          setSyncStatus(null);
        }, 5000);
      } else {
        setSyncStatus(`❌ ${result.message || 'DataSources-Synchronisation fehlgeschlagen'}`);
        setTimeout(() => {
          setSyncStatus(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Fehler bei der DataSources-Synchronisation:', error);
      setSyncStatus('❌ Verbindungsfehler bei der DataSources-Synchronisation');
      setTimeout(() => {
        setSyncStatus(null);
      }, 5000);
    } finally {
      setSyncLoading(false);
    }
  };

  // Document Management Functions
  const loadDocuments = async (employeeId: string) => {
    try {
      setDocumentsLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setDocuments(result.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Dokumente:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList, employeeId: string) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem('authToken');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileKey = `${file.name}-${Date.now()}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));

        const formData = new FormData();
        formData.append('document', file);
        formData.append('employeeId', employeeId);
        formData.append('category', 'general');

        const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const result = await response.json();
        if (result.success) {
          setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
          await loadDocuments(employeeId);
        }
      } catch (error) {
        console.error(`Fehler beim Upload von ${file.name}:`, error);
      }
    }

    setTimeout(() => {
      setUploading(false);
      setUploadProgress({});
    }, 1000);
  };

  const downloadDocument = async (documentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/hr/employees/${selectedEmployee?.id}/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Fehler beim Download:', error);
    }
  };

  const deleteDocument = async (documentId: string, employeeId: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        await loadDocuments(employeeId);
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const getDocumentIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'jpg': case 'jpeg': case 'png': return '🖼️';
      case 'txt': return '📋';
      default: return '📎';
    }
  };

  return (
    <div className="hr-page">
      <div className="page-header">
        <div className="page-title">
          <h1>👥 Mitarbeiter</h1>
          <p>Verwalte alle Mitarbeiter aus verschiedenen Quellen</p>
        </div>
        <div className="page-actions">
          {/* 🔐 PERMISSION-GUARD: DataSources-Synchronisation für alle HR-User */}
          {hasMinimumAccess('access') && (
            <button 
              className="btn btn-primary"
              onClick={syncDataSources}
              disabled={syncLoading}
              title="Synchronisiert alle Benutzer-Datenquellen (Entra ID, Manual, LDAP, Upload) und lädt die Mitarbeiterliste neu"
              style={{ marginRight: '8px' }}
            >
              {syncLoading ? '🔄' : '🔄'} {syncLoading ? 'Synchronisiere...' : 'Daten synchronisieren'}
            </button>
          )}

          {/* 🔐 PERMISSION-GUARD: Ordnerstruktur-Synchronisation nur für Administratoren */}
          {hasMinimumAccess('write') && (
            <button 
              className="btn btn-secondary"
              onClick={syncDirectoryStructure}
              disabled={syncLoading}
              title="Synchronisiert die Ordnerstruktur für alle Benutzer - erstellt fehlende Ordner automatisch"
              style={{ marginRight: '8px' }}
            >
              {syncLoading ? '🔄' : '📁'} {syncLoading ? 'Synchronisiere...' : 'Ordner synchronisieren'}
            </button>
          )}

          {/* 🔐 PERMISSION-GUARD: Zusätzliche Informationen nur mit 'write' Berechtigung */}
          {hasMinimumAccess('write') && (
            <button 
              className="btn btn-primary"
              onClick={() => setSchemaManagerOpen(true)}
              title="Feldtypen für alle Mitarbeiter verwalten"
            >
              📊 Zusätzliche Informationen
            </button>
          )}
          
          {/* 🔐 PERMISSION-INFO: Zeige aktuelle Rolle und Berechtigungen */}
          <div className="permission-info" style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            marginLeft: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🎭 {isAdmin() ? 'Administrator' : 'User'}</span>
            <span>|</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {hasModuleAccess('hr') && <span title="Lese-Berechtigung">👁️</span>} 
              {hasMinimumAccess('write') && <span title="Schreib-Berechtigung">✏️</span>} 
              {hasMinimumAccess('write') && <span title="Erstell-Berechtigung">➕</span>} 
              {(hasMinimumAccess('admin') || isAdmin()) && <span title="Lösch-Berechtigung">🗑️</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status Display */}
      {syncStatus && (
        <div className="sync-status" style={{
          margin: '16px 0',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: syncStatus.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          border: syncStatus.startsWith('✅') ? '1px solid #bbf7d0' : '1px solid #fecaca',
          color: syncStatus.startsWith('✅') ? '#166534' : '#dc2626',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {syncStatus}
        </div>
      )}

      <div className="content-section">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Lade Mitarbeiter...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <h3>❌ Fehler</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadEmployees}>
              🔄 Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !error && employees.length === 0 && (
          <div className="empty-state">
            <h3>📭 Keine Mitarbeiter</h3>
            <p>Es sind noch keine Mitarbeiter vorhanden.</p>
          </div>
        )}

        {!loading && !error && employees.length > 0 && (
          <div className="employees-layout-three-column">
            {/* 1/3: Mitarbeiter-Liste */}
            <div className="employees-list">
              {/* FIXIERTER HEADER - Bleibt beim Scrollen oben */}
              <div className="list-header">
                <h3>👥 Mitarbeiter ({employees.length})</h3>
                
                {/* Suchleiste */}
                <div className="search-section">
                  <input
                    type="text"
                    placeholder="🔍 Name, E-Mail oder Abteilung suchen..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="search-input"
                  />
                </div>

                {/* Filter-Dropdowns */}
                <div className="list-filters">
                  <select 
                    value={filters.department} 
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="">Alle Abteilungen</option>
                    {Array.from(new Set(employees.map(e => e.department).filter(Boolean))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select 
                    value={filters.source} 
                    onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="">Alle Quellen</option>
                    <option value="entra">Entra ID</option>
                    <option value="manual">Manuell</option>
                  </select>
                  
                  {/* Clear Filters Button */}
                  {(filters.search || filters.department || filters.source) && (
                    <button 
                      onClick={() => setFilters({ department: '', source: '', search: '' })}
                      className="btn btn-small btn-secondary"
                      title="Filter zurücksetzen"
                    >
                      ✖️
                    </button>
                  )}
                </div>
              </div>
              
              {/* SCROLLBARER BEREICH - User-Liste */}
              <div className="employee-items">
                {/* Gruppierung nach Source */}
                {['entra', 'manual'].map(source => {
                  let sourceEmployees = employees.filter(emp => emp.source === source);
                  
                  // Apply filters
                  if (filters.search) {
                    const searchTerm = filters.search.toLowerCase();
                    sourceEmployees = sourceEmployees.filter(emp =>
                      emp.displayName.toLowerCase().includes(searchTerm) ||
                      (emp.mail || '').toLowerCase().includes(searchTerm) ||
                      (emp.userPrincipalName || '').toLowerCase().includes(searchTerm) ||
                      (emp.department || '').toLowerCase().includes(searchTerm) ||
                      (emp.jobTitle || '').toLowerCase().includes(searchTerm)
                    );
                  }
                  
                  if (filters.department) {
                    sourceEmployees = sourceEmployees.filter(emp => emp.department === filters.department);
                  }
                  
                  if (filters.source) {
                    sourceEmployees = sourceEmployees.filter(emp => emp.source === filters.source);
                  }
                  
                  if (sourceEmployees.length === 0) return null;
                  
                  return (
                    <div key={source} className="employee-group">
                      <div className="group-header">
                        <h4 className={`source-title ${source}`}>
                          {source === 'entra' ? '🔗 Entra ID' : '✏️ Manuell'} 
                          <span className="count">({sourceEmployees.length})</span>
                        </h4>
                      </div>
                      <div className="group-items">
                        {sourceEmployees.map((employee) => (
                <div
                  key={employee.id}
                            className={`employee-item ${selectedEmployee?.id === employee.id ? 'selected' : ''} source-${employee.source}`}
                  onClick={() => setSelectedEmployee(employee)}
                          >
                            <div className="employee-info">
                              <div className="employee-name">
                                <span className="name">{employee.displayName}</span>
                                <span className={`source-badge ${employee.source}`}>
                                  {employee.source === 'entra' ? '🔗' : '✏️'}
                                </span>
                              </div>
                              <div className="employee-details">
                                <span className="department">{employee.department || 'Keine Abteilung'}</span>
                                <span className="job-title">{employee.jobTitle || 'Keine Position'}</span>
                  </div>
                              <div className="employee-status">
                                <span className={`status ${employee.accountEnabled ? 'active' : 'inactive'}`}>
                                  {employee.accountEnabled ? '✅ Aktiv' : '❌ Inaktiv'}
                      </span>
                    </div>
                  </div>
                          </div>
                        ))}
                  </div>
                </div>
                  );
                })}
                </div>
            </div>
            
            {/* 2/3: User Details */}
            <div className="employees-detail">
              {selectedEmployee ? (
                <div className="employee-detail-panel">
                  <div className="detail-header">
                    <div className="detail-title">
                      <h3>{selectedEmployee.displayName}</h3>
                      <span className="source-badge">{selectedEmployee.source}</span>
                      </div>
                  </div>
                  <div className="employee-content">
                    <div className="detail-sections">
                        <div className="detail-section">
                        <h4>📧 Kontakt</h4>
                        <div className="section-content">
                          <p><strong>E-Mail:</strong> {selectedEmployee.mail || selectedEmployee.userPrincipalName || '-'}</p>
                          <p><strong>Telefon:</strong> {selectedEmployee.mobilePhone || '-'}</p>
                          <p><strong>Büro:</strong> {selectedEmployee.officeLocation || '-'}</p>
                        </div>
                      </div>
                        <div className="detail-section">
                          <h4>🏢 Organisation</h4>
                        <div className="section-content">
                          <p><strong>Abteilung:</strong> {selectedEmployee.department || '-'}</p>
                          <p><strong>Position:</strong> {selectedEmployee.jobTitle || '-'}</p>
                          <p><strong>Kostenstelle:</strong> {selectedEmployee.costCenter || '-'}</p>
                          <p><strong>Unternehmen:</strong> {selectedEmployee.companyName || '-'}</p>
                          {selectedEmployee.manager && (
                            <p><strong>Vorgesetzter:</strong> {selectedEmployee.manager.displayName}</p>
                          )}
                        </div>
                    </div>
                      <div className="detail-section">
                        <h4>ℹ️ System</h4>
                        <div className="section-content">
                          <p><strong>Quelle:</strong> {selectedEmployee.source}</p>
                          <p><strong>Status:</strong> {selectedEmployee.accountEnabled ? 'Aktiv' : 'Inaktiv'}</p>
                          <p><strong>Mitarbeiter-ID:</strong> {selectedEmployee.employeeId || '-'}</p>
                        </div>
                      </div>

                      {/* Zusatzinformationen Section */}
                      <div className="detail-section">
                        <div className="section-header">
                          <h4>📊 Zusatzinformationen</h4>
                          <button 
                            className="btn btn-small btn-secondary"
                            onClick={() => setAdditionalInfoEditorOpen(true)}
                            title="Zusatzinformationen bearbeiten"
                          >
                            ✏️ Bearbeiten
                          </button>
                        </div>
                        <div className="section-content">
                          {additionalInfoFields.length === 0 ? (
                            <p className="empty-info">Keine Zusatzinformationen definiert</p>
                          ) : additionalInfoFields.filter(field => field.hasValue || field.value).length === 0 ? (
                            <p className="empty-info">Keine Werte gesetzt</p>
                          ) : (
                            additionalInfoFields
                              .filter(field => field.hasValue || field.value)
                              .map((field) => (
                                <p key={field.schema.id}>
                                  <strong>{field.schema.name}:</strong> {
                                    field.schema.type === 'boolean' ? 
                                      (field.value === 'true' ? '✅ Ja' : '❌ Nein') : 
                                      field.schema.type === 'number' && field.schema.unit ?
                                        `${field.value} ${field.schema.unit}` :
                                      field.schema.type === 'date' && field.value ?
                                        new Date(field.value).toLocaleDateString('de-DE') :
                                        field.value || '-'
                                  }
                                  <span className="field-category-small" style={{ 
                                    backgroundColor: field.schema.category === 'HR' ? '#10b981' : 
                                                    field.schema.category === 'Finanzen' ? '#f59e0b' : 
                                                    field.schema.category === 'Personal' ? '#3b82f6' : 
                                                    field.schema.category === 'Legal' ? '#8b5cf6' :
                                                    field.schema.category === 'IT' ? '#ef4444' : '#6b7280'
                                  }}>
                                    {field.schema.category}
                                  </span>
                                </p>
                              ))
                          )}
                        </div>
                      </div>
                      </div>
                  </div>
                <div className="employee-actions">
                    <button className="btn btn-small btn-secondary" onClick={() => setSelectedEmployee(null)}>
                      ✖️ Schließen
                  </button>
                  <button className="btn btn-small btn-primary">
                    ✏️ Bearbeiten
                  </button>
                </div>
              </div>
              ) : (
                <div className="no-selection">
                  <h3>👈 Mitarbeiter auswählen</h3>
                  <p>Wähle einen Mitarbeiter aus der Liste, um Details und Dokumente anzuzeigen.</p>
                </div>
              )}
            </div>

            {/* 3/3: Documents Bereich (Rechts) */}
            <div className="employees-documents">
              {selectedEmployee ? (
                <div className="documents-panel">
                  <div className="documents-header">
                    <h3>📂 Dokumente</h3>
                    <p>{selectedEmployee.displayName}</p>
                  </div>

                  <div className="documents-section">
                    {/* Upload Area */}
                    <div 
                      className={`document-dropzone ${uploading ? 'uploading' : ''}`}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!uploading && selectedEmployee) {
                          handleFileUpload(e.dataTransfer.files, selectedEmployee.id);
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => {
                        if (!uploading && selectedEmployee) {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.multiple = true;
                          input.accept = '.pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.txt';
                          input.onchange = (e) => {
                            const files = (e.target as HTMLInputElement).files;
                            if (files) handleFileUpload(files, selectedEmployee.id);
                          };
                          input.click();
                        }
                      }}
                    >
                      <div className="dropzone-content">
                        {uploading ? (
                          <div className="upload-status">
                            <div className="loading-spinner"></div>
                            <p>Upload läuft...</p>
          </div>
                        ) : (
                          <>
                            <div className="dropzone-icon">📁</div>
                            <p><strong>Dateien hierher ziehen</strong></p>
                            <p>oder klicken zum Auswählen</p>
                            <small>PDF, DOC, XLSX, Bilder, TXT (max. 50MB)</small>
                          </>
                        )}
                      </div>
      </div>

                    {/* Upload Progress */}
                    {Object.keys(uploadProgress).length > 0 && (
                      <div className="upload-progress-section">
                        {Object.entries(uploadProgress).map(([fileKey, progress]) => (
                          <div key={fileKey} className="progress-item">
                            <span className="progress-filename">{fileKey.split('-')[0]}</span>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="progress-percent">{progress}%</span>
                          </div>
                        ))}
        </div>
      )}

                    {/* Document List */}
                    <div className="document-list-container">
                      {documentsLoading ? (
                        <div className="loading-state">
                          <div className="loading-spinner"></div>
                          <p>Dokumente werden geladen...</p>
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="empty-state">
                          <h4>📭 Keine Dokumente</h4>
                          <p>Noch keine Dokumente hochgeladen.</p>
                        </div>
                      ) : (
                        <div className="documents-grid">
                          {documents.map((doc) => (
                            <div key={doc.id} className="document-card">
                              <div className="document-icon">
                                {getDocumentIcon(doc.fileType)}
                              </div>
                              <div className="document-info">
                                <div className="document-name" title={doc.fileName}>
                                  {doc.fileName}
                                </div>
                                <div className="document-meta">
                                  <span className="document-size">{doc.fileSize}</span>
                                  <span className="document-category">{doc.category}</span>
            </div>
                                <div className="document-date">
                                  {new Date(doc.uploadDate).toLocaleDateString('de-DE')}
                  </div>
                </div>
                              <div className="document-actions">
                                <button 
                                  className="btn-icon" 
                                  onClick={() => downloadDocument(doc.id, doc.fileName)}
                                  title="Herunterladen"
                                >
                                  📥
                                </button>
                                {/* 🔐 PERMISSION-GUARD: Document Delete nur mit 'delete' Berechtigung */}
                                {(hasMinimumAccess('admin') || isAdmin()) && (
                                  <button 
                                    className="btn-icon delete" 
                                    onClick={() => deleteDocument(doc.id, selectedEmployee.id)}
                                    title="Löschen"
                                  >
                                    🗑️
                                  </button>
                                )}
                  </div>
                </div>
                          ))}
                        </div>
                      )}
                  </div>
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <h3>👈 Mitarbeiter auswählen</h3>
                  <p>Wähle einen Mitarbeiter aus, um Dokumente zu verwalten.</p>
                </div>
              )}
            </div>
          </div>
        )}
            </div>

            <div className="page-summary">
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-number">{
              employees.filter(emp => {
                if (filters.search) {
                  const searchTerm = filters.search.toLowerCase();
                  const matchesSearch = emp.displayName.toLowerCase().includes(searchTerm) ||
                    (emp.mail || '').toLowerCase().includes(searchTerm) ||
                    (emp.userPrincipalName || '').toLowerCase().includes(searchTerm) ||
                    (emp.department || '').toLowerCase().includes(searchTerm) ||
                    (emp.jobTitle || '').toLowerCase().includes(searchTerm);
                  if (!matchesSearch) return false;
                }
                if (filters.department && emp.department !== filters.department) return false;
                if (filters.source && emp.source !== filters.source) return false;
                return true;
              }).length
            }</span>
            <span className="stat-label">Gefiltert</span>
          </div>
          <div className="stat">
            <span className="stat-number">{employees.filter(e => e.source === 'entra').length}</span>
            <span className="stat-label">Entra ID</span>
          </div>
          <div className="stat">
            <span className="stat-number">{employees.filter(e => e.source === 'manual').length}</span>
            <span className="stat-label">Manuell</span>
          </div>
          <div className="stat">
            <span className="stat-number">{employees.filter(e => e.accountEnabled).length}</span>
            <span className="stat-label">Aktiv</span>
          </div>
        </div>
      </div>

      {/* Schema Manager Modal */}
      <SchemaManagerModal
        isOpen={schemaManagerOpen}
        onClose={() => setSchemaManagerOpen(false)}
        onSchemasUpdated={() => {
          // Schemas wurden geändert -> alle User additional info neu laden
          if (selectedEmployee) {
            loadAdditionalInfo(selectedEmployee.id);
          }
        }}
      />

      {/* Additional Info Editor */}
      {selectedEmployee && (
        <AdditionalInfoEditor
          isOpen={additionalInfoEditorOpen}
          onClose={() => setAdditionalInfoEditorOpen(false)}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.displayName}
          onValuesUpdated={() => {
            if (selectedEmployee) {
              loadAdditionalInfo(selectedEmployee.id);
            }
          }}
        />
      )}
    </div>
  );
};

export default EmployeesPage;