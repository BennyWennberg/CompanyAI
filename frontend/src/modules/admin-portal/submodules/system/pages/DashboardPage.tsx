import React, { useState, useEffect } from 'react';
import '../styles/SystemPages.css';

interface SourceStatus {
  source: 'entra' | 'ldap' | 'upload' | 'manual';
  status: 'idle' | 'syncing' | 'error' | 'conflicts' | 'disabled';
  lastSync: string | null;
  userCount: number;
  isConfigured: boolean;
  connectionStatus?: 'connected' | 'error' | 'not_configured';
}

interface DashboardStats {
  totalUsers: number;
  sourceBreakdown: SourceStatus[];
  conflicts: number;
  lastActivity: string;
}

const DashboardPage: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<{[key: string]: SourceStatus}>({});
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Alle 30 Sekunden aktualisieren
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      
      // System-Status laden
      const systemResponse = await fetch('http://localhost:5000/api/health');
      const systemResult = await systemResponse.json();
      setSystemStatus(systemResult);

      // Dashboard-Statistiken laden
      const statsResponse = await fetch('http://localhost:5000/api/admin-portal/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const statsResult = await statsResponse.json();

      // Sync-Status laden
      const syncResponse = await fetch('http://localhost:5000/api/admin-portal/sync/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const syncResult = await syncResponse.json();

      if (statsResult.success && statsResult.data) {
        setDashboardStats(statsResult.data);
      }

      if (syncResult.success && syncResult.data) {
        setSyncStatus(syncResult.data);
      }

    } catch (err) {
      setError('Fehler beim Laden der Dashboard-Daten');
      console.error('Dashboard-Fehler:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSource = async (source: string) => {
    try {
      setSyncingSource(source);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/admin-portal/sync/${source}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode: 'full' })
      });

      const result = await response.json();

      if (result.success) {
        // Dashboard nach Sync aktualisieren
        setTimeout(loadDashboardData, 2000);
      } else {
        alert(`Sync fehlgeschlagen: ${result.message}`);
      }

    } catch (err) {
      alert('Fehler beim Sync');
      console.error('Sync-Fehler:', err);
    } finally {
      setSyncingSource(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingSource('all');

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/sync-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        setTimeout(loadDashboardData, 3000);
      } else {
        alert(`Sync-All fehlgeschlagen: ${result.message}`);
      }

    } catch (err) {
      alert('Fehler beim Sync-All');
      console.error('Sync-All-Fehler:', err);
    } finally {
      setSyncingSource(null);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'entra': return '🏢';
      case 'ldap': return '🗂️';
      case 'upload': return '📊';
      case 'manual': return '✋';
      default: return '📁';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'syncing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'conflicts': return 'text-orange-600';
      case 'not_configured': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (source: SourceStatus) => {
    if (source.status === 'syncing') return 'Synchronisiert...';
    if (!source.isConfigured) return 'Nicht konfiguriert';
    if (source.connectionStatus === 'error') return 'Verbindungsfehler';
    if (source.connectionStatus === 'connected') return 'Verbunden';
    return 'Bereit';
  };

  if (loading) {
    return (
      <div className="admin-portal-page">
        <div className="page-header">
          <div className="page-title">
            <h1>🏢 Admin-Portal</h1>
            <p>Multi-Source User-Integration Dashboard</p>
          </div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Dashboard-Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-portal-page">
        <div className="page-header">
          <div className="page-title">
            <h1>🏢 Admin-Portal</h1>
            <p>Multi-Source User-Integration Dashboard</p>
          </div>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadDashboardData}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🏢 Admin-Portal</h1>
          <p>Multi-Source User-Integration Dashboard</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={handleSyncAll}
            disabled={syncingSource !== null}
          >
            {syncingSource === 'all' ? '🔄 Synchronisiere alle...' : '🔄 Sync All'}
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="content-section">
        <h2>System Status</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <div className="stat-number">
                {systemStatus?.status === 'OK' ? 'Online' : 'Offline'}
              </div>
              <div className="stat-label">Backend</div>
              <div className="stat-description">Port 5000</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎨</div>
            <div className="stat-content">
              <div className="stat-number">Online</div>
              <div className="stat-label">Frontend</div>
              <div className="stat-description">Port 5173</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔐</div>
            <div className="stat-content">
              <div className="stat-number">Aktiv</div>
              <div className="stat-label">Authentifizierung</div>
              <div className="stat-description">Token-basiert</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">79+ Aktiv</div>
              <div className="stat-label">API-Endpunkte</div>
              <div className="stat-description">HR: 8, Support: 3, Admin: 68+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Übersichts-Statistiken */}
      {dashboardStats && (
        <div className="content-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{dashboardStats.totalUsers}</div>
                <div className="stat-label">Gesamt-User</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-number">{dashboardStats.conflicts}</div>
                <div className="stat-label">E-Mail-Konflikte</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-number">{dashboardStats.sourceBreakdown.filter(s => s.isConfigured).length}</div>
                <div className="stat-label">Aktive Quellen</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🕒</div>
              <div className="stat-content">
                <div className="stat-number">
                  {dashboardStats.lastActivity ? new Date(dashboardStats.lastActivity).toLocaleDateString() : 'N/A'}
                </div>
                <div className="stat-label">Letzte Aktivität</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source-Kacheln */}
      <div className="content-section">
        <h2>User-Quellen</h2>
        <div className="sources-grid">
          {Object.entries(syncStatus).map(([source, status]) => (
            <div key={source} className="source-card">
              <div className="source-header">
                <div className="source-info">
                  <span className="source-icon">{getSourceIcon(source)}</span>
                  <div>
                    <h3>{source.charAt(0).toUpperCase() + source.slice(1)}</h3>
                    <p className={`source-status ${getStatusColor(status.connectionStatus || status.status)}`}>
                      {getStatusText(status)}
                    </p>
                  </div>
                </div>
                <div className="source-actions">
                  {(source === 'entra' || source === 'ldap') && (
                    <button
                      className="btn btn-small btn-outline"
                      onClick={() => handleSyncSource(source)}
                      disabled={syncingSource !== null || !status.isConfigured}
                    >
                      {syncingSource === source ? '🔄' : '🔄 Sync'}
                    </button>
                  )}
                  {source === 'upload' && (
                    <button
                      className="btn btn-small btn-outline"
                      onClick={() => window.location.href = '/admin-portal/upload'}
                    >
                      📤 Upload
                    </button>
                  )}
                  {source === 'manual' && (
                    <button
                      className="btn btn-small btn-outline"
                      onClick={() => window.location.href = '/admin-portal/manual'}
                    >
                      ➕ Erstellen
                    </button>
                  )}
                </div>
              </div>

              <div className="source-stats">
                <div className="source-stat">
                  <div className="stat-value">{status.userCount}</div>
                  <div className="stat-label">Users</div>
                </div>
                <div className="source-stat">
                  <div className="stat-value">
                    {status.lastSync 
                      ? new Date(status.lastSync).toLocaleDateString()
                      : 'Nie'
                    }
                  </div>
                  <div className="stat-label">Letzter Sync</div>
                </div>
              </div>

              {!status.isConfigured && (
                <div className="source-warning">
                  <span>⚠️ Quelle nicht konfiguriert</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Schnellaktionen */}
      <div className="content-section">
        <h2>Schnellaktionen</h2>
        <div className="action-buttons">
          <button 
            className="btn btn-secondary"
            onClick={() => window.location.href = '/admin-portal/users'}
          >
            👥 Alle User anzeigen
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => window.location.href = '/admin-portal/conflicts'}
            disabled={!dashboardStats || dashboardStats.conflicts === 0}
          >
            ⚠️ Konflikte lösen ({dashboardStats?.conflicts || 0})
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => window.location.href = '/admin-portal/stats'}
          >
            📊 Erweiterte Statistiken
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
