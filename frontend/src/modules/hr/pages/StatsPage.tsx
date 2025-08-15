import React, { useState, useEffect } from 'react';
import '../styles/HRPages.css';

interface HRStats {
  totalEmployees: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  averageTenure: number;
}

const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<HRStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Keine Authentifizierung gefunden');
        return;
      }

      const response = await fetch('http://localhost:5000/api/hr/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError(result.message || 'Fehler beim Laden der Statistiken');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Statistiken:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="hr-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Statistiken...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hr-page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Fehler beim Laden</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadStats}>
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📊 HR-Statistiken</h1>
          <p>Aktuelle Übersicht über alle HR-Kennzahlen</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadStats}>
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      {stats && (
        <div className="content-section">
          <div className="stats-grid">
            {/* Gesamtzahlen */}
            <div className="stat-card highlight">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Gesamte Mitarbeiter</h3>
                <div className="stat-number">{stats.totalEmployees}</div>
                <p>Alle registrierten Mitarbeiter</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <h3>Durchschnittliche Betriebszugehörigkeit</h3>
                <div className="stat-number">{stats.averageTenure.toFixed(1)} Monate</div>
                <p>Mittlere Verweildauer im Unternehmen</p>
              </div>
            </div>

            {/* Abteilungen */}
            <div className="stat-card wide">
              <div className="stat-content">
                <h3>👔 Mitarbeiter nach Abteilung</h3>
                <div className="department-stats">
                  {(() => {
                    const totalKnownDepartments = Object.values(stats.byDepartment).reduce((sum, c) => sum + c, 0) || 1;
                    const sortedEntries = Object.entries(stats.byDepartment)
                      .sort(([a], [b]) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
                    return sortedEntries.map(([dept, count]) => (
                      <div key={dept} className="department-item">
                        <div className="department-info">
                          <span className="department-name">{dept}</span>
                          <span className="department-count">{count} Mitarbeiter</span>
                        </div>
                        <div className="department-bar">
                          <div 
                            className="department-fill"
                            style={{ 
                              width: `${(count / totalKnownDepartments) * 100}%`,
                              background: getDepartmentColor(dept)
                            }}
                          ></div>
                        </div>
                        <span className="department-percentage">
                          {((count / totalKnownDepartments) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="stat-card">
              <div className="stat-content">
                <h3>📈 Status-Verteilung</h3>
                <div className="status-stats">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="status-item">
                      <div className={`status-indicator ${status}`}></div>
                      <span className="status-label">{getStatusLabel(status)}</span>
                      <span className="status-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getDepartmentColor = (department: string): string => {
  const colors: Record<string, string> = {
    'IT': '#3b82f6',
    'Sales': '#10b981',
    'Marketing': '#f59e0b',
    'HR': '#8b5cf6',
    'Finance': '#ef4444'
  };
  return colors[department] || '#6b7280';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'active': 'Aktiv',
    'inactive': 'Inaktiv',
    'pending': 'Ausstehend'
  };
  return labels[status] || status;
};

export default StatsPage;
