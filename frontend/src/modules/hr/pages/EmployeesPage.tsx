import React, { useState, useEffect } from 'react';
import '../styles/HRPages.css';

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
  lastSignInDateTime?: string;
  
  // Persönliche Informationen
  givenName?: string;
  surname?: string;
  officeLocation?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  faxNumber?: string;
  
  // Organisatorische Informationen
  companyName?: string;
  employeeId?: string;
  employeeType?: string;
  costCenter?: string;
  division?: string;
  manager?: {
    id: string;
    displayName: string;
  };
  
  // Technische/Account-Informationen
  signInSessionsValidFromDateTime?: string;
  passwordPolicies?: string;
  usageLocation?: string;
  preferredLanguage?: string;
  aboutMe?: string;
  
  // Lizenzen & Apps
  assignedLicenses?: Array<{
    skuId: string;
    disabledPlans?: string[];
  }>;
  assignedPlans?: Array<{
    assignedDateTime: string;
    capabilityStatus: string;
    service: string;
    servicePlanId: string;
  }>;
  
  // Sicherheit & Sync
  userType?: string;
  onPremisesSecurityIdentifier?: string;
  onPremisesSyncEnabled?: boolean;
  onPremisesDistinguishedName?: string;
  onPremisesDomainName?: string;
  onPremisesSamAccountName?: string;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Antwort von /api/data/users liefert direkt ein Array in data

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<CombinedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'all' | 'manual' | 'entra'>('entra');
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    search: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState<CombinedUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    displayName: '',
    mail: '',
    department: '',
    jobTitle: '',
    accountEnabled: true,
  });
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    loadEmployees();
  }, [filters, dataSource]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Keine Authentifizierung gefunden');
        return;
      }

      const params = new URLSearchParams();
      params.append('source', dataSource);
      // Mappe Status-Filter auf accountEnabled (active=true, inactive=false)
      if (filters.status === 'active') params.append('accountEnabled', 'true');
      if (filters.status === 'inactive') params.append('accountEnabled', 'false');

      const response = await fetch(`http://localhost:5000/api/data/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: APIResponse<CombinedUser[]> = await response.json();

      if (result.success && Array.isArray(result.data)) {
        let employeeData = result.data;

        // Client-side Search Filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          employeeData = employeeData.filter(emp =>
            emp.displayName.toLowerCase().includes(searchTerm) ||
            (emp.mail || '').toLowerCase().includes(searchTerm) ||
            (emp.userPrincipalName || '').toLowerCase().includes(searchTerm)
          );
        }

        // Erzeuge dynamische Abteilungs-Optionen (bekannte + "Unbekannt" zusammengefasst), alphabetisch sortiert, mit Counts
        const deptCountMap = employeeData.reduce((acc: Record<string, number>, emp) => {
          const raw = (emp.department || '').trim();
          if (!raw) return acc;
          const lower = raw.toLowerCase();
          if (lower === 'unbekannt' || lower === 'unknown') return acc;
          acc[raw] = (acc[raw] || 0) + 1;
          return acc;
        }, {});

        const unknownCount = employeeData.reduce((count, emp) => {
          const raw = (emp.department || '').trim();
          if (!raw) return count + 1;
          const lower = raw.toLowerCase();
          return (lower === 'unbekannt' || lower === 'unknown') ? count + 1 : count;
        }, 0);

        let options = Object.entries(deptCountMap)
          .sort(([a], [b]) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
          .map(([name, count]) => ({ name, count }));
        if (unknownCount > 0) {
          options = [...options, { name: 'Unbekannt', count: unknownCount }]
            .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
        }
        setDepartmentOptions(options);

        // Client-side Department Filter anwenden
        if (filters.department) {
          const filterLower = filters.department.toLowerCase();
          if (filters.department === '__known__') {
            // Nur Mitarbeiter mit bekannter Abteilung (nicht leer/Unbekannt/Unknown)
            employeeData = employeeData.filter(emp => {
              const raw = (emp.department || '').trim();
              if (!raw) return false;
              const lower = raw.toLowerCase();
              return lower !== 'unbekannt' && lower !== 'unknown';
            });
          } else if (filterLower === 'unbekannt') {
            employeeData = employeeData.filter(emp => {
              const raw = (emp.department || '').trim();
              if (!raw) return true;
              const lower = raw.toLowerCase();
              return lower === 'unbekannt' || lower === 'unknown';
            });
          } else {
            employeeData = employeeData.filter(emp => (emp.department || '').trim() === filters.department);
          }
        }

        setEmployees(employeeData);
      } else {
        setError(result.message || 'Fehler beim Laden der Mitarbeiter');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Mitarbeiter:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hinweis: frühere getDataSourceInfo() entfernt, da ungenutzt

  const getStatusBadge = (emp: CombinedUser) => {
    if (emp.accountEnabled === true) return { label: 'Aktiv', class: 'status-active' };
    if (emp.accountEnabled === false) return { label: 'Inaktiv', class: 'status-inactive' };
    return { label: 'Unbekannt', class: 'status-unknown' };
  };

  const getInitials = (displayName: string) => {
    const parts = displayName.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const getDepartmentIcon = (department: string) => {
    const icons: Record<string, string> = {
      'IT': '💻',
      'Sales': '📊',
      'Marketing': '📈',
      'HR': '👥',
      'Finance': '💰'
    };
    return icons[department] || '🏢';
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setSyncMessage('Keine Authentifizierung gefunden');
        return;
      }

      const response = await fetch('http://localhost:5000/api/data/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setSyncMessage(result.message || 'Synchronisation erfolgreich');
        await loadEmployees();
      } else {
        setSyncMessage(result.message || 'Synchronisation fehlgeschlagen');
      }
    } catch (e) {
      setSyncMessage('Fehler bei der Synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      displayName: '',
      mail: '',
      department: '',
      jobTitle: '',
      accountEnabled: true,
    });
    setCreateError(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateLoading(false);
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setCreateError('Keine Authentifizierung gefunden');
        return;
      }

      const body: any = {
        displayName: createForm.displayName.trim(),
        mail: createForm.mail.trim() || undefined,
        department: createForm.department.trim() || undefined,
        jobTitle: createForm.jobTitle.trim() || undefined,
        accountEnabled: createForm.accountEnabled,
      };

      // UserPrincipalName automatisch aus E-Mail generieren, falls E-Mail vorhanden
      if (createForm.mail.trim()) {
        body.userPrincipalName = createForm.mail.trim();
      }

      const response = await fetch('http://localhost:5000/api/data/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result: APIResponse<CombinedUser> = await response.json();
      if (!result.success || !result.data) {
        setCreateError(result.message || 'Erstellung fehlgeschlagen');
        return;
      }

      setSyncMessage('Neuer Mitarbeiter erfolgreich angelegt');
      setShowCreateModal(false);
      await loadEmployees();
      setSelectedEmployee(result.data);
      setDataSource('manual');
    } catch (err) {
      setCreateError('Fehler beim Erstellen des Mitarbeiters');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="hr-page">
      <div className="page-header">
        <div className="page-title">
          <h1>👥 Mitarbeiter-Verwaltung</h1>
          <p>Zentrale Verwaltung aller Mitarbeiterinformationen</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Neuer Mitarbeiter
          </button>
          <button className="btn btn-secondary" onClick={handleSync} disabled={syncing || loading} style={{ marginLeft: '0.5rem' }}>
            {syncing ? '🔄 Synchronisiere...' : '🔄 Daten synchronisieren'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="inline-info-banner" role="status" aria-live="polite">
          <span className="info-icon">ℹ️</span>
          <span className="info-text">{syncMessage}</span>
        </div>
      )}


      {/* Filter Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Suche:</label>
            <input
              type="text"
              placeholder="Name oder E-Mail suchen..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Abteilung:</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="filter-select"
            >
              <option value="">Alle Abteilungen</option>
              {/* Mit Abteilung (nur bekannte Abteilungen) */}
              {departmentOptions.length > 0 && (
                <option value="__known__">
                  {`Mit Abteilung (${departmentOptions.reduce((sum, o) => {
                    const nameLower = o.name.toLowerCase();
                    if (nameLower === 'unbekannt' || nameLower === 'unknown') return sum;
                    return sum + o.count;
                  }, 0)})`}
                </option>
              )}
              {departmentOptions.map(opt => (
                <option key={opt.name} value={opt.name}>{`${opt.name} (${opt.count})`}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="filter-select"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="pending">Ausstehend</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Datenquelle:</label>
            <select
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value as 'all' | 'manual' | 'entra')}
              className="filter-select"
            >
              <option value="all">🔄 Alle Quellen</option>
              <option value="entra">🏢 Entra Admin Center</option>
              <option value="manual">✋ Manuell</option>
            </select>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={() => setFilters({ department: '', status: '', search: '' })}
          >
            🔄 Filter zurücksetzen
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="content-section">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Lade Mitarbeiter...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Fehler beim Laden</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadEmployees}>
              🔄 Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !error && employees.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>Keine Mitarbeiter gefunden</h3>
            <p>Es wurden keine Mitarbeiter mit den aktuellen Filtern gefunden.</p>
          </div>
        )}

        {!loading && !error && employees.length > 0 && (
          <div className={`employees-layout${selectedEmployee ? ' selected' : ''}`}>
            <div className="employees-list">
            {employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`employee-card compact${selectedEmployee?.id === employee.id ? ' selected' : ''}`}
                  onClick={() => setSelectedEmployee(employee)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedEmployee(employee); } }}
                >
                <div className="employee-header">
                  <div className="employee-avatar">
                    {getInitials(employee.displayName)}
                  </div>
                  <div className="employee-basic">
                    <h3>{employee.displayName}</h3>
                    <p className="employee-email">{employee.mail || employee.userPrincipalName || ''}</p>
                    <div className="employee-source">
                      <span className={`source-badge source-${employee.source}`}>
                        {employee.source === 'manual' ? '✋ Manuell' : '🏢 Entra ID'}
                      </span>
                    </div>
                  </div>
                  <div className={`status-badge ${getStatusBadge(employee).class}`}>
                    {getStatusBadge(employee).label}
                  </div>
                </div>
                </div>
              ))}
            </div>
            <div className="employees-detail">
              {selectedEmployee && (
                <div className="employee-detail-panel">
                  <div className="detail-header">
                    <div className="employee-avatar large">
                      {getInitials(selectedEmployee.displayName)}
                    </div>
                    <div className="detail-title">
                      <h2>{selectedEmployee.displayName}</h2>
                      <p className="employee-email">{selectedEmployee.mail || selectedEmployee.userPrincipalName || ''}</p>
                      <div className="employee-source">
                        <span className={`source-badge source-${selectedEmployee.source}`}>
                          {selectedEmployee.source === 'manual' ? '✋ Manuell' : '🏢 Entra ID'}
                        </span>
                        <span className={`status-badge ${getStatusBadge(selectedEmployee).class}`} style={{ marginLeft: '8px' }}>
                          {getStatusBadge(selectedEmployee).label}
                        </span>
                      </div>
                  </div>
                </div>
                
                  <div className="detail-sections">
                    {/* Persönliche Informationen */}
                    <div className="detail-section">
                      <h4>👤 Persönliche Informationen</h4>
                      {selectedEmployee.givenName && (
                        <div className="detail-row">
                          <span className="detail-icon">👤</span>
                          <span className="detail-label">Vorname:</span>
                          <span className="detail-value">{selectedEmployee.givenName}</span>
                        </div>
                      )}
                      {selectedEmployee.surname && (
                        <div className="detail-row">
                          <span className="detail-icon">👤</span>
                          <span className="detail-label">Nachname:</span>
                          <span className="detail-value">{selectedEmployee.surname}</span>
                        </div>
                      )}
                      {selectedEmployee.employeeId && (
                        <div className="detail-row">
                          <span className="detail-icon">🆔</span>
                          <span className="detail-label">Mitarbeiter-ID:</span>
                          <span className="detail-value">{selectedEmployee.employeeId}</span>
                        </div>
                      )}
                      {selectedEmployee.userType && (
                  <div className="detail-row">
                          <span className="detail-icon">👥</span>
                          <span className="detail-label">Benutzertyp:</span>
                          <span className="detail-value">{selectedEmployee.userType}</span>
                        </div>
                      )}
                  </div>
                  
                    {/* Organisatorische Informationen */}
                    <div className="detail-section">
                      <h4>🏢 Organisation</h4>
                      <div className="detail-row">
                        <span className="detail-icon">{getDepartmentIcon(selectedEmployee.department || '')}</span>
                        <span className="detail-label">Abteilung:</span>
                        <span className="detail-value">{selectedEmployee.department || '-'}</span>
                      </div>
                  <div className="detail-row">
                    <span className="detail-icon">💼</span>
                    <span className="detail-label">Position:</span>
                        <span className="detail-value">{selectedEmployee.jobTitle || '-'}</span>
                      </div>
                      {selectedEmployee.companyName && (
                        <div className="detail-row">
                          <span className="detail-icon">🏢</span>
                          <span className="detail-label">Unternehmen:</span>
                          <span className="detail-value">{selectedEmployee.companyName}</span>
                        </div>
                      )}
                      {selectedEmployee.employeeType && (
                        <div className="detail-row">
                          <span className="detail-icon">👔</span>
                          <span className="detail-label">Anstellungsart:</span>
                          <span className="detail-value">{selectedEmployee.employeeType}</span>
                        </div>
                      )}
                      {selectedEmployee.costCenter && (
                        <div className="detail-row">
                          <span className="detail-icon">💰</span>
                          <span className="detail-label">Kostenstelle:</span>
                          <span className="detail-value">{selectedEmployee.costCenter}</span>
                        </div>
                      )}
                      {selectedEmployee.division && (
                        <div className="detail-row">
                          <span className="detail-icon">🏬</span>
                          <span className="detail-label">Geschäftsbereich:</span>
                          <span className="detail-value">{selectedEmployee.division}</span>
                        </div>
                      )}
                      {selectedEmployee.manager && (
                        <div className="detail-row">
                          <span className="detail-icon">👨‍💼</span>
                          <span className="detail-label">Vorgesetzter:</span>
                          <span className="detail-value">{selectedEmployee.manager.displayName}</span>
                        </div>
                      )}
                    </div>

                    {/* Kontaktinformationen */}
                    <div className="detail-section">
                      <h4>📞 Kontakt</h4>
                      {selectedEmployee.mobilePhone && (
                        <div className="detail-row">
                          <span className="detail-icon">📱</span>
                          <span className="detail-label">Mobil:</span>
                          <span className="detail-value">{selectedEmployee.mobilePhone}</span>
                        </div>
                      )}
                      {selectedEmployee.businessPhones && selectedEmployee.businessPhones.length > 0 && (
                        <div className="detail-row">
                          <span className="detail-icon">☎️</span>
                          <span className="detail-label">Telefon:</span>
                          <span className="detail-value">{selectedEmployee.businessPhones.join(', ')}</span>
                        </div>
                      )}
                      {selectedEmployee.faxNumber && (
                        <div className="detail-row">
                          <span className="detail-icon">📠</span>
                          <span className="detail-label">Fax:</span>
                          <span className="detail-value">{selectedEmployee.faxNumber}</span>
                        </div>
                      )}
                      {selectedEmployee.officeLocation && (
                        <div className="detail-row">
                          <span className="detail-icon">🏢</span>
                          <span className="detail-label">Büro:</span>
                          <span className="detail-value">{selectedEmployee.officeLocation}</span>
                        </div>
                      )}
                    </div>

                    {/* Adresse */}
                    {(selectedEmployee.streetAddress || selectedEmployee.city || selectedEmployee.country) && (
                      <div className="detail-section">
                        <h4>📍 Adresse</h4>
                        {selectedEmployee.streetAddress && (
                          <div className="detail-row">
                            <span className="detail-icon">🏠</span>
                            <span className="detail-label">Straße:</span>
                            <span className="detail-value">{selectedEmployee.streetAddress}</span>
                          </div>
                        )}
                        {selectedEmployee.city && (
                          <div className="detail-row">
                            <span className="detail-icon">🏙️</span>
                            <span className="detail-label">Stadt:</span>
                            <span className="detail-value">
                              {selectedEmployee.postalCode && `${selectedEmployee.postalCode} `}{selectedEmployee.city}
                            </span>
                          </div>
                        )}
                        {selectedEmployee.state && (
                          <div className="detail-row">
                            <span className="detail-icon">🗺️</span>
                            <span className="detail-label">Bundesland:</span>
                            <span className="detail-value">{selectedEmployee.state}</span>
                          </div>
                        )}
                        {selectedEmployee.country && (
                          <div className="detail-row">
                            <span className="detail-icon">🌍</span>
                            <span className="detail-label">Land:</span>
                            <span className="detail-value">{selectedEmployee.country}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Technische Informationen */}
                    <div className="detail-section">
                      <h4>🔧 Technische Details</h4>
                      {selectedEmployee.preferredLanguage && (
                        <div className="detail-row">
                          <span className="detail-icon">🌐</span>
                          <span className="detail-label">Sprache:</span>
                          <span className="detail-value">{selectedEmployee.preferredLanguage}</span>
                        </div>
                      )}
                      {selectedEmployee.usageLocation && (
                        <div className="detail-row">
                          <span className="detail-icon">📍</span>
                          <span className="detail-label">Standort:</span>
                          <span className="detail-value">{selectedEmployee.usageLocation}</span>
                        </div>
                      )}
                      {selectedEmployee.createdDateTime && (
                        <div className="detail-row">
                          <span className="detail-icon">📅</span>
                          <span className="detail-label">Erstellt:</span>
                          <span className="detail-value">{new Date(selectedEmployee.createdDateTime).toLocaleDateString('de-DE')}</span>
                        </div>
                      )}
                      {selectedEmployee.lastSignInDateTime && (
                        <div className="detail-row">
                          <span className="detail-icon">🔑</span>
                          <span className="detail-label">Letzte Anmeldung:</span>
                          <span className="detail-value">{new Date(selectedEmployee.lastSignInDateTime).toLocaleDateString('de-DE')}</span>
                        </div>
                      )}
                    </div>

                    {/* Lizenzen */}
                    {selectedEmployee.assignedLicenses && selectedEmployee.assignedLicenses.length > 0 && (
                      <div className="detail-section">
                        <h4>📄 Lizenzen</h4>
                        {selectedEmployee.assignedLicenses.map((license, index) => (
                          <div key={index} className="detail-row">
                            <span className="detail-icon">📋</span>
                            <span className="detail-label">Lizenz:</span>
                            <span className="detail-value">{license.skuId}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* On-Premises Sync Info */}
                    {(selectedEmployee.onPremisesSyncEnabled || selectedEmployee.onPremisesDomainName) && (
                      <div className="detail-section">
                        <h4>🔄 On-Premises</h4>
                        {selectedEmployee.onPremisesDomainName && (
                          <div className="detail-row">
                            <span className="detail-icon">🏢</span>
                            <span className="detail-label">Domäne:</span>
                            <span className="detail-value">{selectedEmployee.onPremisesDomainName}</span>
                          </div>
                        )}
                        {selectedEmployee.onPremisesSamAccountName && (
                          <div className="detail-row">
                            <span className="detail-icon">👤</span>
                            <span className="detail-label">SAM Account:</span>
                            <span className="detail-value">{selectedEmployee.onPremisesSamAccountName}</span>
                          </div>
                        )}
                        {selectedEmployee.onPremisesSyncEnabled !== undefined && (
                          <div className="detail-row">
                            <span className="detail-icon">🔄</span>
                            <span className="detail-label">Sync aktiviert:</span>
                            <span className="detail-value">{selectedEmployee.onPremisesSyncEnabled ? 'Ja' : 'Nein'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Über mich */}
                    {selectedEmployee.aboutMe && (
                      <div className="detail-section">
                        <h4>📝 Über mich</h4>
                        <div className="detail-text">
                          {selectedEmployee.aboutMe}
                  </div>
                      </div>
                    )}
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
              )}
            </div>
            {selectedEmployee && <div className="employees-spacer"></div>}
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && !error && (
        <div className="page-summary">
          <p>
            <strong>{employees.length}</strong> Mitarbeiter angezeigt
            {filters.department && ` in ${filters.department}`}
            {filters.status && ` mit Status "${filters.status === 'active' ? 'Aktiv' : filters.status === 'inactive' ? 'Inaktiv' : 'Ausstehend'}"`}
          </p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Neuen Mitarbeiter anlegen</h3>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {createError && <div className="error-state" style={{padding: '8px'}}>{createError}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label>Anzeigename</label>
                    <input className="filter-input" value={createForm.displayName} onChange={(e) => setCreateForm(v => ({...v, displayName: e.target.value}))} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>E-Mail</label>
                    <input className="filter-input" type="email" value={createForm.mail} onChange={(e) => setCreateForm(v => ({...v, mail: e.target.value}))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Abteilung</label>
                    <input className="filter-input" value={createForm.department} onChange={(e) => setCreateForm(v => ({...v, department: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <input className="filter-input" value={createForm.jobTitle} onChange={(e) => setCreateForm(v => ({...v, jobTitle: e.target.value}))} />
                  </div>
                </div>

                <div className="form-row">
                  <label className="checkbox">
                    <input type="checkbox" checked={createForm.accountEnabled} onChange={(e) => setCreateForm(v => ({...v, accountEnabled: e.target.checked}))} />
                    Konto aktiv
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal} disabled={createLoading}>Abbrechen</button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? 'Speichere…' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;

