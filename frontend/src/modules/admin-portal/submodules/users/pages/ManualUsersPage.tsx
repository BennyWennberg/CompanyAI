import React, { useState, useEffect } from 'react';
import '../styles/UsersPages.css';

interface ManualUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  
  // Organisatorische Informationen
  department?: string;
  jobTitle?: string;
  companyName?: string;
  employeeId?: string;
  officeLocation?: string;
  
  // Kontaktdaten
  mobilePhone?: string;
  businessPhone?: string;
  
  // Account-Settings
  userPrincipalName?: string;
  preferredLanguage?: string;
  usageLocation?: string;
  userType?: string;
  isActive: boolean;
  
  // Meta-Daten
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Manual-spezifische Felder
  notes?: string;
  tags?: string[];
  customFields?: {[key: string]: any};
}

interface ManualUserStats {
  totalUsers: number;
  activeUsers: number;
  createdToday: number;
  createdThisWeek: number;
  recentUsers: ManualUser[];
  topCreators: Array<{creator: string, count: number}>;
}

const ManualUsersPage: React.FC = () => {
  const [users, setUsers] = useState<ManualUser[]>([]);
  const [stats, setStats] = useState<ManualUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManualUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManualUser | null>(null);

  // Filter-States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Form-States
  const [formData, setFormData] = useState({
    // Pflichtfelder
    firstName: '',
    lastName: '',
    email: '',
    displayName: '',
    
    // Organisatorische Informationen
    department: '',
    jobTitle: '',
    companyName: '',
    employeeId: '',
    officeLocation: '',
    
    // Kontaktdaten
    mobilePhone: '',
    businessPhone: '',
    
    // Account-Settings
    userPrincipalName: '',
    preferredLanguage: 'de-DE',
    usageLocation: 'DE',
    userType: 'Member',
    isActive: true,
    
    // Manual-spezifische Felder
    notes: '',
    tags: [] as string[],
    customFields: {} as {[key: string]: string}
  });

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [page, searchTerm, activeFilter]);

  // Auto-Fill für Anzeigename
  useEffect(() => {
    if (formData.firstName && formData.lastName) {
      setFormData(prev => ({
        ...prev,
        displayName: `${formData.firstName} ${formData.lastName}`
      }));
    }
  }, [formData.firstName, formData.lastName]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (activeFilter !== 'all') {
        params.append('isActive', (activeFilter === 'active').toString());
      }

      const response = await fetch(`http://localhost:5000/api/admin-portal/manual/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setUsers(result.data.users);
        setTotal(result.data.total);
      } else {
        setError(result.message || 'Fehler beim Laden der User');
      }

    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('User-Load-Fehler:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/manual/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Stats-Load-Fehler:', err);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const requestData = {
        // Pflichtfelder
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        displayName: formData.displayName || `${formData.firstName} ${formData.lastName}`,
        
        // Organisatorische Informationen
        department: formData.department || undefined,
        jobTitle: formData.jobTitle || undefined,
        companyName: formData.companyName || undefined,
        employeeId: formData.employeeId || undefined,
        officeLocation: formData.officeLocation || undefined,
        
        // Kontaktdaten
        mobilePhone: formData.mobilePhone || undefined,
        businessPhone: formData.businessPhone || undefined,
        
        // Account-Settings
        userPrincipalName: formData.userPrincipalName || undefined,
        preferredLanguage: formData.preferredLanguage,
        usageLocation: formData.usageLocation,
        userType: formData.userType,
        isActive: formData.isActive,
        
        // Manual-spezifische Felder
        notes: formData.notes || undefined,
        tags: formData.tags,
        customFields: formData.customFields
      };

      const response = await fetch('http://localhost:5000/api/admin-portal/manual/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        // Formular zurücksetzen
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          displayName: '',
          department: '',
          jobTitle: '',
          companyName: '',
          employeeId: '',
          officeLocation: '',
          mobilePhone: '',
          businessPhone: '',
          userPrincipalName: '',
          preferredLanguage: 'de-DE',
          usageLocation: 'DE',
          userType: 'Member',
          isActive: true,
          notes: '',
          tags: [],
          customFields: {}
        });
        loadUsers();
        loadStats();
      } else {
        alert(`Fehler beim Erstellen: ${result.message}`);
      }

    } catch (err) {
      alert('Fehler beim Erstellen des Users');
      console.error('Create-User-Fehler:', err);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`http://localhost:5000/api/admin-portal/manual/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          displayName: formData.displayName,
          department: formData.department,
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
          employeeId: formData.employeeId,
          officeLocation: formData.officeLocation,
          mobilePhone: formData.mobilePhone,
          businessPhone: formData.businessPhone,
          userPrincipalName: formData.userPrincipalName,
          preferredLanguage: formData.preferredLanguage,
          usageLocation: formData.usageLocation,
          userType: formData.userType,
          isActive: formData.isActive,
          notes: formData.notes,
          tags: formData.tags,
          customFields: formData.customFields
        })
      });

      const result = await response.json();

      if (result.success) {
        setEditingUser(null);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          displayName: '',
          department: '',
          jobTitle: '',
          companyName: '',
          employeeId: '',
          officeLocation: '',
          mobilePhone: '',
          businessPhone: '',
          userPrincipalName: '',
          preferredLanguage: 'de-DE',
          usageLocation: 'DE',
          userType: 'Member',
          isActive: true,
          notes: '',
          tags: [],
          customFields: {}
        });
        loadUsers();
      } else {
        alert(`Fehler beim Aktualisieren: ${result.message}`);
      }

    } catch (err) {
      alert('Fehler beim Aktualisieren des Users');
      console.error('Update-User-Fehler:', err);
    }
  };

  const handleDeleteUser = async (user: ManualUser) => {
    if (!window.confirm(`User "${user.displayName}" wirklich löschen?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`http://localhost:5000/api/admin-portal/manual/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        loadUsers();
        loadStats();
      } else {
        alert(`Fehler beim Löschen: ${result.message}`);
      }

    } catch (err) {
      alert('Fehler beim Löschen des Users');
      console.error('Delete-User-Fehler:', err);
    }
  };

  const handleEditClick = (user: ManualUser) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      displayName: user.displayName,
      department: user.department || '',
      jobTitle: user.jobTitle || '',
      companyName: user.companyName || '',
      employeeId: user.employeeId || '',
      officeLocation: user.officeLocation || '',
      mobilePhone: user.mobilePhone || '',
      businessPhone: user.businessPhone || '',
      userPrincipalName: user.userPrincipalName || '',
      preferredLanguage: user.preferredLanguage || 'de-DE',
      usageLocation: user.usageLocation || 'DE',
      userType: user.userType || 'Member',
      isActive: user.isActive,
      notes: user.notes || '',
      tags: user.tags || [],
      customFields: user.customFields || {}
    });
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value
      }
    }));
  };

  const addCustomField = () => {
    const key = prompt('Custom Field Name:');
    if (key && key.trim()) {
      setFormData(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [key.trim()]: ''
        }
      }));
    }
  };

  const removeCustomField = (key: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: Object.fromEntries(
        Object.entries(prev.customFields).filter(([k]) => k !== key)
      )
    }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      displayName: '',
      department: '',
      jobTitle: '',
      companyName: '',
      employeeId: '',
      officeLocation: '',
      mobilePhone: '',
      businessPhone: '',
      userPrincipalName: '',
      preferredLanguage: 'de-DE',
      usageLocation: 'DE',
      userType: 'Member',
      isActive: true,
      notes: '',
      tags: [],
      customFields: {}
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>✋ Manuelle User</h1>
          <p>Web-basierte User-Erstellung und -Verwaltung</p>
        </div>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="content-section">
          <h2>📊 Übersicht</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalUsers}</div>
                <div className="stat-label">Gesamt User</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.activeUsers}</div>
                <div className="stat-label">Aktive User</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.createdToday}</div>
                <div className="stat-label">Heute erstellt</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-number">{stats.createdThisWeek}</div>
                <div className="stat-label">Diese Woche</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User-Liste */}
      <div className="content-section">
        <h2>👥 User-Liste</h2>
        
        <div className="filters-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>Suche:</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Name oder E-Mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Status:</label>
              <select
                className="filter-select"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
              >
                <option value="all">Alle</option>
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Lade manuelle User...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadUsers}>
              Erneut versuchen
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>Keine manuellen User gefunden</h3>
            <p>Verwende das Formular unten um den ersten User zu erstellen</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>E-Mail</th>
                    <th>Status</th>
                    <th>Erstellt</th>
                    <th>Erstellt von</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.displayName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? '✅ Aktiv' : '❌ Inaktiv'}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{user.createdBy}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-small btn-outline"
                            onClick={() => setSelectedUser(user)}
                          >
                            Details
                          </button>
                          <button
                            className="btn btn-small btn-outline"
                            onClick={() => handleEditClick(user)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            className="btn btn-small btn-outline btn-danger"
                            onClick={() => handleDeleteUser(user)}
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginierung */}
            {total > 20 && (
              <div className="pagination">
                <div className="pagination-info">
                  Zeige {users.length} von {total} Usern
                </div>
                <div className="pagination-controls">
                  <button
                    className="btn btn-small"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Zurück
                  </button>
                  <span className="page-info">Seite {page}</span>
                  <button
                    className="btn btn-small"
                    onClick={() => setPage(p => p + 1)}
                    disabled={users.length < 20}
                  >
                    Weiter →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User-Erstellungsformular - permanent unten auf der Seite */}
      <div className="content-section">
        <div className="form-header">
          <h2>📝 Neuen User erstellen</h2>
          <button 
            className="btn btn-outline"
            onClick={resetForm}
          >
            Formular zurücksetzen
          </button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Vorname *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Nachname *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>E-Mail *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Anzeigename *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              className="form-input"
              placeholder="Wird automatisch aus Vor-/Nachname generiert"
              required
            />
          </div>
        </div>

        {/* Organisatorische Informationen */}
        <div className="form-section">
          <h4>🏢 Organisatorische Informationen</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Abteilung</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="form-input"
                placeholder="z.B. IT, HR, Marketing"
              />
            </div>
            <div className="form-group">
              <label>Position/Jobtitel</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                className="form-input"
                placeholder="z.B. Software Developer, HR Manager"
              />
            </div>
            <div className="form-group">
              <label>Firmenname</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                className="form-input"
                placeholder="z.B. Company AG"
              />
            </div>
            <div className="form-group">
              <label>Mitarbeiternummer</label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                className="form-input"
                placeholder="z.B. EMP-001"
              />
            </div>
            <div className="form-group">
              <label>Bürostandort</label>
              <input
                type="text"
                value={formData.officeLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, officeLocation: e.target.value }))}
                className="form-input"
                placeholder="z.B. München, Berlin, Home Office"
              />
            </div>
          </div>
        </div>

        {/* Kontaktdaten */}
        <div className="form-section">
          <h4>📞 Kontaktdaten</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Mobiltelefon</label>
              <input
                type="tel"
                value={formData.mobilePhone}
                onChange={(e) => setFormData(prev => ({ ...prev, mobilePhone: e.target.value }))}
                className="form-input"
                placeholder="z.B. +49 151 12345678"
              />
            </div>
            <div className="form-group">
              <label>Geschäftstelefon</label>
              <input
                type="tel"
                value={formData.businessPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                className="form-input"
                placeholder="z.B. +49 89 12345-100"
              />
            </div>
          </div>
        </div>

        {/* Account-Einstellungen */}
        <div className="form-section">
          <h4>⚙️ Account-Einstellungen</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>User Principal Name</label>
              <input
                type="text"
                value={formData.userPrincipalName}
                onChange={(e) => setFormData(prev => ({ ...prev, userPrincipalName: e.target.value }))}
                className="form-input"
                placeholder="z.B. max.mustermann@company.com"
              />
            </div>
            <div className="form-group">
              <label>Bevorzugte Sprache</label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                className="form-input"
              >
                <option value="de-DE">Deutsch</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="fr-FR">Français</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
            <div className="form-group">
              <label>Verwendungsstandort</label>
              <select
                value={formData.usageLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, usageLocation: e.target.value }))}
                className="form-input"
              >
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
                <option value="US">USA</option>
                <option value="GB">United Kingdom</option>
                <option value="FR">Frankreich</option>
              </select>
            </div>
            <div className="form-group">
              <label>Benutzertyp</label>
              <select
                value={formData.userType}
                onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value }))}
                className="form-input"
              >
                <option value="Member">Mitarbeiter</option>
                <option value="Guest">Gast</option>
              </select>
            </div>
            <div className="form-group">
              <label>Account Status</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Account ist aktiv
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Manual-spezifische Felder */}
        <div className="form-section">
          <h4>📝 Zusätzliche Informationen</h4>
          <div className="form-group">
            <label>Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="form-textarea"
              rows={3}
              placeholder="Interne Notizen, Besonderheiten, etc."
            />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="custom-fields-section">
          <div className="custom-fields-header">
            <h4>Custom Fields</h4>
            <button type="button" className="btn btn-small btn-outline" onClick={addCustomField}>
              + Feld hinzufügen
            </button>
          </div>
          {Object.entries(formData.customFields).map(([key, value]) => (
            <div key={key} className="custom-field-row">
              <label>{key}:</label>
              <div className="custom-field-input-group">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  className="btn btn-small btn-outline btn-danger"
                  onClick={() => removeCustomField(key)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button
            className="btn btn-outline"
            onClick={resetForm}
          >
            Formular zurücksetzen
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateUser}
            disabled={!formData.firstName || !formData.lastName || !formData.email}
          >
            User erstellen
          </button>
        </div>
      </div>

      {/* Edit Form Modal nur für Bearbeitung */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => {
          setEditingUser(null);
          resetForm();
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User bearbeiten</h3>
              <button className="modal-close" onClick={() => {
                setEditingUser(null);
                resetForm();
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Vorname *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nachname *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>E-Mail *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Anzeigename *</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              {/* Organisatorische Informationen */}
              <div className="form-section">
                <h4>🏢 Organisatorische Informationen</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Abteilung</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. IT, HR, Marketing"
                    />
                  </div>
                  <div className="form-group">
                    <label>Position/Jobtitel</label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. Software Developer, HR Manager"
                    />
                  </div>
                  <div className="form-group">
                    <label>Firmenname</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. Company AG"
                    />
                  </div>
                  <div className="form-group">
                    <label>Mitarbeiternummer</label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. EMP-001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Bürostandort</label>
                    <input
                      type="text"
                      value={formData.officeLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, officeLocation: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. München, Berlin, Home Office"
                    />
                  </div>
                </div>
              </div>

              {/* Kontaktdaten */}
              <div className="form-section">
                <h4>📞 Kontaktdaten</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Mobiltelefon</label>
                    <input
                      type="tel"
                      value={formData.mobilePhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobilePhone: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. +49 151 12345678"
                    />
                  </div>
                  <div className="form-group">
                    <label>Geschäftstelefon</label>
                    <input
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. +49 89 12345-100"
                    />
                  </div>
                </div>
              </div>

              {/* Account-Einstellungen */}
              <div className="form-section">
                <h4>⚙️ Account-Einstellungen</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>User Principal Name</label>
                    <input
                      type="text"
                      value={formData.userPrincipalName}
                      onChange={(e) => setFormData(prev => ({ ...prev, userPrincipalName: e.target.value }))}
                      className="form-input"
                      placeholder="z.B. max.mustermann@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Bevorzugte Sprache</label>
                    <select
                      value={formData.preferredLanguage}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                      className="form-input"
                    >
                      <option value="de-DE">Deutsch</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="fr-FR">Français</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Verwendungsstandort</label>
                    <select
                      value={formData.usageLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, usageLocation: e.target.value }))}
                      className="form-input"
                    >
                      <option value="DE">Deutschland</option>
                      <option value="AT">Österreich</option>
                      <option value="CH">Schweiz</option>
                      <option value="US">USA</option>
                      <option value="GB">United Kingdom</option>
                      <option value="FR">Frankreich</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Benutzertyp</label>
                    <select
                      value={formData.userType}
                      onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value }))}
                      className="form-input"
                    >
                      <option value="Member">Mitarbeiter</option>
                      <option value="Guest">Gast</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Account Status</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        />
                        Account ist aktiv
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual-spezifische Felder */}
              <div className="form-section">
                <h4>📝 Zusätzliche Informationen</h4>
                <div className="form-group">
                  <label>Notizen</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="form-textarea"
                    rows={3}
                    placeholder="Interne Notizen, Besonderheiten, etc."
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setEditingUser(null);
                    resetForm();
                  }}
                >
                  Abbrechen
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUpdateUser}
                  disabled={!formData.firstName || !formData.lastName || !formData.email}
                >
                  User aktualisieren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-detail-grid">
                <div className="detail-row">
                  <label>Name:</label>
                  <span>{selectedUser.displayName}</span>
                </div>
                <div className="detail-row">
                  <label>E-Mail:</label>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="detail-row">
                  <label>Status:</label>
                  <span>{selectedUser.isActive ? '✅ Aktiv' : '❌ Inaktiv'}</span>
                </div>
                <div className="detail-row">
                  <label>Abteilung:</label>
                  <span>{selectedUser.department || 'Nicht angegeben'}</span>
                </div>
                <div className="detail-row">
                  <label>Position:</label>
                  <span>{selectedUser.jobTitle || 'Nicht angegeben'}</span>
                </div>
                <div className="detail-row">
                  <label>Firma:</label>
                  <span>{selectedUser.companyName || 'Nicht angegeben'}</span>
                </div>
                <div className="detail-row">
                  <label>Erstellt am:</label>
                  <span>{formatDate(selectedUser.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <label>Erstellt von:</label>
                  <span>{selectedUser.createdBy}</span>
                </div>
                {selectedUser.notes && (
                  <div className="detail-row">
                    <label>Notizen:</label>
                    <span>{selectedUser.notes}</span>
                  </div>
                )}
              </div>

              {/* Custom Fields anzeigen */}
              {selectedUser.customFields && Object.keys(selectedUser.customFields).length > 0 && (
                <div className="custom-fields-display">
                  <h4>Custom Fields</h4>
                  {Object.entries(selectedUser.customFields).map(([key, value]) => (
                    <div key={key} className="detail-row">
                      <label>{key}:</label>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualUsersPage;