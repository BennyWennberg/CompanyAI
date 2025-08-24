import React, { useState, useEffect } from 'react';
import '../styles/UsersPages.css';

interface SyncSchedule {
  id: string;
  source: 'entra' | 'ldap';
  enabled: boolean;
  cronExpression: string;
  description: string;
  timezone: string;
  retryOnError: boolean;
  retryAttempts: number;
  retryDelay: number;
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'inactive' | 'error';
}

interface SyncHistoryEntry {
  id: string;
  scheduleId: string;
  source: 'entra' | 'ldap';
  triggerType: 'scheduled' | 'manual' | 'retry';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  usersProcessed?: number;
  usersAdded?: number;
  usersUpdated?: number;
  errorMessage?: string;
  duration?: number;
}

interface SourceStatus {
  source: string;
  lastSync?: Date;
  userCount: number;
  status: 'running' | 'completed' | 'failed' | 'idle';
}

const SyncManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State für Schedules
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus[]>([]);
  
  // State für Schedule-Bearbeitung
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // State für manuelle Syncs
  const [runningSyncs, setRunningSyncs] = useState<string[]>([]);

  useEffect(() => {
    loadData();
    
    // Auto-Refresh alle 30 Sekunden
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setError(null);

      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Parallel laden
      const [schedulesRes, historyRes, statusRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin-portal/schedules', { headers }),
        fetch('http://localhost:5000/api/admin-portal/schedules/history?limit=20', { headers }),
        fetch('http://localhost:5000/api/admin-portal/sync/status', { headers })
      ]);

      const [schedulesData, historyData, statusData] = await Promise.all([
        schedulesRes.json(),
        historyRes.json(),
        statusRes.json()
      ]);

      if (schedulesData.success) {
        setSchedules(schedulesData.data || []);
      }

      if (historyData.success) {
        setSyncHistory(historyData.data || []);
      }

      if (statusData.success) {
        // Wandle das alte Format in das neue um
        const statusArray = Object.entries(statusData.data || {}).map(([source, status]: [string, any]) => ({
          source,
          lastSync: status.lastSync ? new Date(status.lastSync) : undefined,
          userCount: status.userCount || 0,
          status: status.status || 'idle'
        }));
        setSourceStatus(statusArray.filter(s => s.source === 'entra' || s.source === 'ldap'));
      }

      setLoading(false);
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      setLoading(false);
    }
  };

  const handleManualSync = async (source: 'entra' | 'ldap') => {
    try {
      setRunningSyncs(prev => [...prev, source]);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/admin-portal/sync/${source}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode: 'full', dryRun: false })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadData(); // Daten neu laden
      } else {
        setError(result.message || `${source} Sync fehlgeschlagen`);
      }
    } catch (err) {
      setError(`Fehler beim ${source} Sync`);
    } finally {
      setRunningSyncs(prev => prev.filter(s => s !== source));
    }
  };

  const handleToggleSchedule = async (schedule: SyncSchedule) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/admin-portal/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !schedule.enabled })
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
      } else {
        setError(result.message || 'Schedule-Update fehlgeschlagen');
      }
    } catch (err) {
      setError('Fehler beim Schedule-Update');
    }
  };

  const formatTime = (date: Date | string | undefined): string => {
    if (!date) return 'Nie';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0) {
      return `vor ${diffMinutes}min`;
    } else if (diffHours < 24) {
      return `vor ${diffHours}h ${diffMinutes}min`;
    } else {
      return d.toLocaleDateString('de-DE');
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'active': return '✅';
      case 'inactive': return '⏸️';
      case 'error': return '❌';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getSourceIcon = (source: string): string => {
    switch (source) {
      case 'entra': return '🏢';
      case 'ldap': return '🗂️';
      default: return '📁';
    }
  };

  if (loading) {
    return (
      <div className="admin-portal-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Sync-Management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-portal-page">
        <div className="error-state">
          <h3>❌ Fehler</h3>
          <p>{error}</p>
          <button onClick={loadData} className="btn btn-primary">
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🔄 Sync-Management</h1>
          <p>Automatische und manuelle Synchronisation verwalten</p>
        </div>
        <div className="page-actions">
          <button 
            onClick={loadData} 
            className="btn btn-secondary"
            disabled={loading}
          >
            🔄 Aktualisieren
          </button>
          <button 
            onClick={() => setShowCreateForm(true)} 
            className="btn btn-primary"
          >
            ➕ Neuer Schedule
          </button>
        </div>
      </div>

      {/* Sync-Übersicht Dashboard */}
      <div className="content-section">
        <h2>📊 Sync-Übersicht</h2>
        <div className="sync-overview-grid">
          {sourceStatus.map(source => (
            <div key={source.source} className="sync-overview-card">
              <div className="sync-card-header">
                <span className="sync-source-icon">{getSourceIcon(source.source)}</span>
                <div className="sync-source-info">
                  <h3>{source.source === 'entra' ? 'Entra ID' : 'LDAP'}</h3>
                  <p>{source.userCount.toLocaleString()} User</p>
                </div>
                <span className="sync-status-badge">{getStatusIcon(source.status)}</span>
              </div>
              <div className="sync-card-details">
                <p><strong>Letzter Sync:</strong> {formatTime(source.lastSync)}</p>
                <p><strong>Status:</strong> {source.status}</p>
                
                <div className="sync-card-actions">
                  <button 
                    onClick={() => handleManualSync(source.source as 'entra' | 'ldap')}
                    className="btn btn-small btn-primary"
                    disabled={runningSyncs.includes(source.source)}
                  >
                    {runningSyncs.includes(source.source) ? '🔄 Läuft...' : '🚀 Sync jetzt'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Geplante Synchronisationen */}
      <div className="content-section">
        <h2>⏰ Geplante Synchronisationen</h2>
        
        {schedules.length === 0 ? (
          <div className="empty-state">
            <p>Keine Schedules konfiguriert</p>
            <button 
              onClick={() => setShowCreateForm(true)} 
              className="btn btn-primary"
            >
              ➕ Ersten Schedule erstellen
            </button>
          </div>
        ) : (
          <div className="schedules-list">
            {schedules.map(schedule => (
              <div key={schedule.id} className="schedule-card">
                <div className="schedule-header">
                  <div className="schedule-info">
                    <span className="schedule-source">
                      {getSourceIcon(schedule.source)} {schedule.source === 'entra' ? 'Entra ID' : 'LDAP'}
                    </span>
                    <span className="schedule-status">{getStatusIcon(schedule.status)}</span>
                  </div>
                  <div className="schedule-toggle">
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={schedule.enabled}
                        onChange={() => handleToggleSchedule(schedule)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="schedule-details">
                  <div className="schedule-config">
                    <p><strong>Beschreibung:</strong> {schedule.description}</p>
                    <p><strong>Ausführungszeit:</strong> {schedule.cronExpression}</p>
                    <p><strong>Retry-Versuche:</strong> {schedule.retryAttempts}x bei Fehlern</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sofortige Sync-Aktionen */}
      <div className="content-section">
        <h2>🎛️ Sofortige Sync-Aktionen</h2>
        <div className="manual-sync-grid">
          
          <div className="manual-sync-card">
            <div className="sync-card-header">
              <span className="sync-source-icon">🏢</span>
              <div className="sync-source-info">
                <h3>Entra ID</h3>
                <p>Microsoft Azure Active Directory</p>
              </div>
            </div>
            <div className="sync-card-actions">
              <button 
                onClick={() => handleManualSync('entra')}
                className="btn btn-primary"
                disabled={runningSyncs.includes('entra')}
              >
                {runningSyncs.includes('entra') ? '🔄 Sync läuft...' : '🚀 Sync jetzt'}
              </button>
            </div>
          </div>

          <div className="manual-sync-card">
            <div className="sync-card-header">
              <span className="sync-source-icon">🗂️</span>
              <div className="sync-source-info">
                <h3>LDAP</h3>
                <p>LDAP Directory Server</p>
              </div>
            </div>
            <div className="sync-card-actions">
              <button 
                onClick={() => handleManualSync('ldap')}
                className="btn btn-primary"
                disabled={runningSyncs.includes('ldap')}
              >
                {runningSyncs.includes('ldap') ? '🔄 Sync läuft...' : '🚀 Sync jetzt'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sync-Historie */}
      <div className="content-section">
        <h2>📜 Letzte Sync-Aktivitäten</h2>
        
        {syncHistory.length === 0 ? (
          <div className="empty-state">
            <p>Keine Sync-Historie verfügbar</p>
          </div>
        ) : (
          <div className="sync-history-table">
            <table>
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Quelle</th>
                  <th>Typ</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map(entry => (
                  <tr key={entry.id} className={`history-row status-${entry.status}`}>
                    <td>
                      {new Date(entry.startTime).toLocaleDateString('de-DE')} {' '}
                      {new Date(entry.startTime).toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td>
                      <span className="history-source">
                        {getSourceIcon(entry.source)} {entry.source === 'entra' ? 'Entra' : 'LDAP'}
                      </span>
                    </td>
                    <td>
                      <span className={`history-trigger trigger-${entry.triggerType}`}>
                        {entry.triggerType === 'scheduled' ? '⏰ Geplant' : 
                         entry.triggerType === 'manual' ? '🎛️ Manuell' : '🔄 Retry'}
                      </span>
                    </td>
                    <td>
                      <span className={`history-status status-${entry.status}`}>
                        {getStatusIcon(entry.status)} {entry.status}
                      </span>
                    </td>
                    <td>
                      {entry.usersProcessed || 0} verarbeitet
                      {entry.usersAdded ? ` (+${entry.usersAdded})` : ''}
                    </td>
                    <td>
                      {entry.errorMessage ? (
                        <span className="error-message" title={entry.errorMessage}>
                          ❌ Fehler
                        </span>
                      ) : (
                        <span className="success-message">✅ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Schedule Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>➕ Neuen Schedule erstellen</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <CreateScheduleForm 
                onSubmit={async (scheduleData) => {
                  try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch('http://localhost:5000/api/admin-portal/schedules', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(scheduleData)
                    });

                    const result = await response.json();
                    if (result.success) {
                      setShowCreateForm(false);
                      await loadData();
                    } else {
                      setError(result.message || 'Schedule-Erstellung fehlgeschlagen');
                    }
                  } catch (err) {
                    setError('Fehler beim Erstellen des Schedules');
                  }
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Schedule-Erstellungsformular
interface CreateScheduleFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const CreateScheduleForm: React.FC<CreateScheduleFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    source: 'entra' as 'entra' | 'ldap',
    enabled: true,
    time: '06:00',
    description: '',
    retryOnError: true,
    retryAttempts: 3,
    retryDelay: 15
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const [hour, minute] = formData.time.split(':').map(Number);
    const cronExpression = `${minute} ${hour} * * *`;
    
    await onSubmit({
      source: formData.source,
      enabled: formData.enabled,
      cronExpression,
      description: formData.description || `Tägliche ${formData.source === 'entra' ? 'Entra ID' : 'LDAP'} Synchronisation`,
      timezone: 'Europe/Berlin',
      retryOnError: formData.retryOnError,
      retryAttempts: formData.retryAttempts,
      retryDelay: formData.retryDelay
    });
  };

  return (
    <form onSubmit={handleSubmit} className="create-schedule-form">
      <div className="form-group">
        <label>📁 Datenquelle:</label>
        <select 
          value={formData.source}
          onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as 'entra' | 'ldap' }))}
          className="form-control"
        >
          <option value="entra">🏢 Entra ID (Microsoft)</option>
          <option value="ldap">🗂️ LDAP Directory</option>
        </select>
      </div>

      <div className="form-group">
        <label>🕕 Ausführungszeit:</label>
        <input 
          type="time"
          value={formData.time}
          onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
          className="form-control"
        />
        <small>Täglich um diese Uhrzeit (Europe/Berlin)</small>
      </div>

      <div className="form-group">
        <label>📝 Beschreibung:</label>
        <input 
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optionale Beschreibung..."
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label>
          <input 
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          ✅ Schedule sofort aktivieren
        </label>
      </div>

      <div className="form-group">
        <label>
          <input 
            type="checkbox"
            checked={formData.retryOnError}
            onChange={(e) => setFormData(prev => ({ ...prev, retryOnError: e.target.checked }))}
          />
          🔄 Bei Fehlern automatisch wiederholen
        </label>
      </div>

      {formData.retryOnError && (
        <div className="retry-config">
          <div className="form-row">
            <div className="form-group">
              <label>🔢 Retry-Versuche:</label>
              <input 
                type="number"
                min="1"
                max="10"
                value={formData.retryAttempts}
                onChange={(e) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>⏱️ Retry-Delay (Minuten):</label>
              <input 
                type="number"
                min="5"
                max="120"
                value={formData.retryDelay}
                onChange={(e) => setFormData(prev => ({ ...prev, retryDelay: parseInt(e.target.value) }))}
                className="form-control"
              />
            </div>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          ❌ Abbrechen
        </button>
        <button type="submit" className="btn btn-primary">
          💾 Schedule erstellen
        </button>
      </div>
    </form>
  );
};

export default SyncManagementPage;
