import React, { useState, useEffect } from 'react';
import '../styles/PermissionsPages.css';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

const AuditPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    dateFrom: '',
    dateTo: '',
    success: 'all'
  });

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`http://localhost:5000/api/admin-portal/permissions/audit?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setAuditLogs(result.data);
      } else {
        setError(result.message || 'Fehler beim Laden der Audit-Logs');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Audit-Logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    loadAuditLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      resource: '',
      dateFrom: '',
      dateTo: '',
      success: 'all'
    });
  };

  if (loading) {
    return (
      <div className="permissions-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Audit-Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="permissions-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📋 Audit-Logs</h1>
          <p>Überwachung aller Benutzer-Aktivitäten und Systemzugriffe</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">
            Logs exportieren
          </button>
        </div>
      </div>

      {/* Filter-Sektion */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Benutzer:</label>
            <input
              type="text"
              placeholder="Benutzer-ID oder Name"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Aktion:</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">Alle Aktionen</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Erstellen</option>
              <option value="update">Aktualisieren</option>
              <option value="delete">Löschen</option>
              <option value="read">Lesen</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Resource:</label>
            <select
              value={filters.resource}
              onChange={(e) => handleFilterChange('resource', e.target.value)}
            >
              <option value="">Alle Resources</option>
              <option value="users">Benutzer</option>
              <option value="roles">Rollen</option>
              <option value="groups">Gruppen</option>
              <option value="tokens">API-Tokens</option>
              <option value="settings">Einstellungen</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Von:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Bis:</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.success}
              onChange={(e) => handleFilterChange('success', e.target.value)}
            >
              <option value="all">Alle</option>
              <option value="true">Erfolgreich</option>
              <option value="false">Fehlgeschlagen</option>
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button 
            className="btn btn-primary"
            onClick={handleApplyFilters}
          >
            Filter anwenden
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleClearFilters}
          >
            Filter zurücksetzen
          </button>
        </div>
      </div>

      {error && (
        <div className="error-state">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="content-section">
        {auditLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Keine Audit-Logs gefunden</h3>
            <p>Keine Aktivitäten für die gewählten Filter gefunden.</p>
          </div>
        ) : (
          <div className="audit-logs-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zeitstempel</th>
                  <th>Benutzer</th>
                  <th>Aktion</th>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>IP-Adresse</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className={`audit-row ${log.success ? 'success' : 'failure'}`}>
                    <td>
                      <div className="timestamp">
                        <strong>{new Date(log.timestamp).toLocaleDateString('de-DE')}</strong>
                        <small>{new Date(log.timestamp).toLocaleTimeString('de-DE')}</small>
                      </div>
                    </td>
                    <td>
                      <div className="user-info">
                        <strong>{log.userName}</strong>
                        <small>{log.userId}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`action-tag ${log.action}`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="resource-tag">
                        {log.resource}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${log.success ? 'success' : 'failure'}`}>
                        {log.success ? '✅ Erfolgreich' : '❌ Fehlgeschlagen'}
                      </span>
                    </td>
                    <td>
                      <span className="ip-address">
                        {log.ipAddress}
                      </span>
                    </td>
                    <td>
                      <div className="details-cell">
                        {log.success ? (
                          <span className="success-details">
                            {JSON.stringify(log.details, null, 2)}
                          </span>
                        ) : (
                          <span className="error-details">
                            {log.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="page-summary">
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Gesamt-Einträge:</span>
            <span className="stat-value">{auditLogs.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Erfolgreich:</span>
            <span className="stat-value success">
              {auditLogs.filter(log => log.success).length}
            </span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Fehlgeschlagen:</span>
            <span className="stat-value failure">
              {auditLogs.filter(log => !log.success).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
