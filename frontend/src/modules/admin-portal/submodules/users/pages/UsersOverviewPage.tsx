import React, { useState, useEffect } from 'react';
import '../styles/UsersPages.css';

interface UnifiedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  isActive: boolean;
  lastSync: string;
  source: 'entra' | 'ldap' | 'upload' | 'manual';
  externalId?: string;
  createdAt: string;
  updatedAt: string;
  sourceData: any;
  conflicts: string[];
}

// interface PaginatedResponse {
//   data: UnifiedUser[];
//   pagination: {
//     total: number;
//     page: number;
//     limit: number;
//     hasNext: boolean;
//     hasPrev: boolean;
//   };
// }

const UsersOverviewPage: React.FC = () => {
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);

  // Filter-States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['entra', 'ldap', 'upload', 'manual']);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadUsers();
  }, [pagination.page, searchTerm, selectedSources, activeFilter, sortBy, sortOrder]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (selectedSources.length < 4) {
        params.append('sources', selectedSources.join(','));
      }

      if (activeFilter !== 'all') {
        params.append('isActive', (activeFilter === 'active').toString());
      }

      const response = await fetch(`http://localhost:5000/api/admin-portal/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setUsers(result.data.data);
        setPagination(result.data.pagination);
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

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        return prev.filter(s => s !== source);
      } else {
        return [...prev, source];
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'entra': return 'source-entra';
      case 'ldap': return 'source-ldap';
      case 'upload': return 'source-upload';
      case 'manual': return 'source-manual';
      default: return 'source-default';
    }
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

  const exportUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/export/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `admin-portal-users-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export fehlgeschlagen');
      console.error('Export-Fehler:', error);
    }
  };

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>👥 User-Übersicht</h1>
          <p>Vereinheitlichte Ansicht aller User aus allen Quellen</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={exportUsers}>
            📤 Exportieren
          </button>
          <button className="btn btn-primary" onClick={loadUsers}>
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      {/* Filter-Bereich */}
      <div className="content-section">
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

            <div className="filter-group">
              <label>Sortierung:</label>
              <select
                className="filter-select"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
              >
                <option value="updatedAt-desc">Zuletzt aktualisiert</option>
                <option value="email-asc">E-Mail (A-Z)</option>
                <option value="displayName-asc">Name (A-Z)</option>
                <option value="source-asc">Quelle</option>
                <option value="createdAt-desc">Zuletzt erstellt</option>
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Quellen:</label>
              <div className="source-filters">
                {['entra', 'ldap', 'upload', 'manual'].map(source => (
                  <button
                    key={source}
                    className={`source-filter-btn ${selectedSources.includes(source) ? 'active' : ''} ${getSourceColor(source)}`}
                    onClick={() => handleSourceToggle(source)}
                  >
                    <span className="source-icon">{getSourceIcon(source)}</span>
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User-Tabelle */}
      <div className="content-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Lade User...</p>
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
            <p>Keine User gefunden</p>
            <p>Prüfe die Filter-Einstellungen oder lade neue User-Daten</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>E-Mail</th>
                    <th>Quelle</th>
                    <th>Status</th>
                    <th>Letzter Sync</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={`${user.source}-${user.id}`}>
                      <td>
                        <div className="user-cell">
                          <div className="user-name">
                            {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}
                          </div>
                          {user.conflicts.length > 0 && (
                            <div className="user-conflict">⚠️ Konflikte</div>
                          )}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <div className={`source-badge ${getSourceColor(user.source)}`}>
                          <span className="source-icon">{getSourceIcon(user.source)}</span>
                          {user.source}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? '✅ Aktiv' : '❌ Inaktiv'}
                        </span>
                      </td>
                      <td>{formatDate(user.lastSync)}</td>
                      <td>
                        <button
                          className="btn btn-small btn-outline"
                          onClick={() => setSelectedUser(user)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginierung */}
            <div className="pagination">
              <div className="pagination-info">
                Zeige {users.length} von {pagination.total} Usern
              </div>
              <div className="pagination-controls">
                <button
                  className="btn btn-small"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  ← Zurück
                </button>
                <span className="page-info">
                  Seite {pagination.page}
                </span>
                <button
                  className="btn btn-small"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Weiter →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User-Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User-Details</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-detail-grid">
                <div className="detail-row">
                  <label>Name:</label>
                  <span>{selectedUser.displayName || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <label>E-Mail:</label>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="detail-row">
                  <label>Quelle:</label>
                  <span className={`source-badge ${getSourceColor(selectedUser.source)}`}>
                    {getSourceIcon(selectedUser.source)} {selectedUser.source}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Status:</label>
                  <span className={`status-badge ${selectedUser.isActive ? 'active' : 'inactive'}`}>
                    {selectedUser.isActive ? '✅ Aktiv' : '❌ Inaktiv'}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Erstellt:</label>
                  <span>{formatDate(selectedUser.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <label>Aktualisiert:</label>
                  <span>{formatDate(selectedUser.updatedAt)}</span>
                </div>
                <div className="detail-row">
                  <label>Letzter Sync:</label>
                  <span>{formatDate(selectedUser.lastSync)}</span>
                </div>
                {selectedUser.externalId && (
                  <div className="detail-row">
                    <label>Externe ID:</label>
                    <span>{selectedUser.externalId}</span>
                  </div>
                )}
              </div>

              {/* Source-spezifische Daten */}
              {selectedUser.sourceData && (
                <div className="source-data-section">
                  <h4>Quell-spezifische Daten:</h4>
                  <pre className="source-data-pre">
                    {JSON.stringify(selectedUser.sourceData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Konflikte */}
              {selectedUser.conflicts.length > 0 && (
                <div className="conflicts-section">
                  <h4>⚠️ Konflikte:</h4>
                  <ul>
                    {selectedUser.conflicts.map((conflict, index) => (
                      <li key={index}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersOverviewPage;
