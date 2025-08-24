import React, { useState, useEffect } from 'react';
import '../styles/PermissionsPages.css';

interface UserGroup {
  id: string;
  name: string;
  description: string;
  roles: string[];
  users: string[];
  permissions: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/permissions/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setGroups(result.data);
      } else {
        setError(result.message || 'Fehler beim Laden der Gruppen');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Gruppen:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Möchten Sie die Gruppe "${groupName}" wirklich löschen?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/admin-portal/permissions/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        await loadGroups();
      } else {
        setError(result.message || 'Fehler beim Löschen der Gruppe');
      }
    } catch (err) {
      setError('Fehler beim Löschen der Gruppe');
      console.error('Fehler beim Löschen der Gruppe:', err);
    }
  };

  if (loading) {
    return (
      <div className="permissions-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Gruppen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="permissions-page">
      <div className="page-header">
        <div className="page-title">
          <h1>👥 Gruppen-Verwaltung</h1>
          <p>Verwalten Sie Benutzergruppen und deren Rollenzuweisungen</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            Neue Gruppe erstellen
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
        {groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>Keine Gruppen gefunden</h3>
            <p>Erstellen Sie eine neue Gruppe, um zu beginnen.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Erste Gruppe erstellen
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <div className="group-info">
                    <h3>{group.name}</h3>
                    <p>{group.description}</p>
                    {group.isDefault && (
                      <span className="default-badge">Standard-Gruppe</span>
                    )}
                  </div>
                  <div className="group-actions">
                    <button className="btn btn-small btn-secondary">
                      Bearbeiten
                    </button>
                    <button 
                      className="btn btn-small btn-outline"
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      disabled={group.isDefault}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                
                <div className="group-stats">
                  <div className="stat">
                    <span className="stat-label">Benutzer:</span>
                    <span className="stat-value">{group.users.length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Rollen:</span>
                    <span className="stat-value">{group.roles.length}</span>
                  </div>
                </div>

                <div className="group-details">
                  <div className="group-roles">
                    <h4>Rollen:</h4>
                    <div className="roles-list">
                      {group.roles.map((role) => (
                        <span key={role} className="role-tag">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="group-permissions">
                    <h4>Effektive Berechtigungen:</h4>
                    <div className="permissions-list">
                      {group.permissions.map((permission, idx) => (
                        <span key={idx} className="permission-tag small">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Form Modal würde hier hin */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Neue Gruppe erstellen</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>
            {/* Form-Inhalt würde hier hin */}
            <p>Gruppen-Erstellungs-Form folgt...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;