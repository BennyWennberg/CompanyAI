import React, { useState, useEffect } from 'react';
import '../styles/PermissionsPages.css';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  action: string;
  resource: string;
  description: string;
}

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      
      // Lade Rollen
      const rolesResponse = await fetch('http://localhost:5000/api/admin-portal/permissions/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Lade verfügbare Permissions
      const permissionsResponse = await fetch('http://localhost:5000/api/admin-portal/permissions/available', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const rolesResult = await rolesResponse.json();
      const permissionsResult = await permissionsResponse.json();

      if (rolesResult.success && rolesResult.data) {
        setRoles(rolesResult.data);
      }

      if (permissionsResult.success && permissionsResult.data) {
        setPermissions(permissionsResult.data);
      }

      if (!rolesResult.success) {
        setError(rolesResult.message || 'Fehler beim Laden der Rollen');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Rollen:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (roleData: Partial<Role>) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/permissions/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
        setShowCreateForm(false);
      } else {
        setError(result.message || 'Fehler beim Erstellen der Rolle');
      }
    } catch (err) {
      setError('Fehler beim Erstellen der Rolle');
      console.error('Fehler beim Erstellen der Rolle:', err);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Möchten Sie diese Rolle wirklich löschen?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/admin-portal/permissions/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
      } else {
        setError(result.message || 'Fehler beim Löschen der Rolle');
      }
    } catch (err) {
      setError('Fehler beim Löschen der Rolle');
      console.error('Fehler beim Löschen der Rolle:', err);
    }
  };

  if (loading) {
    return (
      <div className="permissions-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Rollen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="permissions-page">
      <div className="page-header">
        <div className="page-title">
          <h1>👑 Rollen-Verwaltung</h1>
          <p>Verwalten Sie Benutzerrollen und deren Berechtigungen</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            Neue Rolle erstellen
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
        {roles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👑</div>
            <h3>Keine Rollen gefunden</h3>
            <p>Erstellen Sie eine neue Rolle, um zu beginnen.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Erste Rolle erstellen
            </button>
          </div>
        ) : (
          <div className="roles-grid">
            {roles.map((role) => (
              <div key={role.id} className="role-card">
                <div className="role-header">
                  <div className="role-info">
                    <h3>{role.name}</h3>
                    <p>{role.description}</p>
                  </div>
                  <div className="role-actions">
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => setEditingRole(role)}
                    >
                      Bearbeiten
                    </button>
                    <button 
                      className="btn btn-small btn-outline"
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                
                <div className="role-stats">
                  <div className="stat">
                    <span className="stat-label">Benutzer:</span>
                    <span className="stat-value">{role.userCount}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Berechtigungen:</span>
                    <span className="stat-value">{role.permissions.length}</span>
                  </div>
                </div>

                <div className="role-permissions">
                  <h4>Berechtigungen:</h4>
                  <div className="permissions-list">
                    {role.permissions.map((permission) => (
                      <span key={permission.id} className="permission-tag">
                        {permission.action}:{permission.resource}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingRole) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRole(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <CreateRoleForm 
                role={editingRole}
                permissions={permissions}
                onSubmit={handleCreateRole}
                onCancel={() => {
                  setShowCreateForm(false);
                  setEditingRole(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CreateRoleForm Component
interface CreateRoleFormProps {
  role?: Role | null;
  permissions: Permission[];
  onSubmit: (roleData: Partial<Role>) => Promise<void>;
  onCancel: () => void;
}

const CreateRoleForm: React.FC<CreateRoleFormProps> = ({ role, permissions, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    selectedPermissions: role?.permissions.map(p => p.id) || []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name: formData.name,
      description: formData.description,
      permissions: permissions.filter(p => formData.selectedPermissions.includes(p.id))
    });
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionId)
        ? prev.selectedPermissions.filter(id => id !== permissionId)
        : [...prev.selectedPermissions, permissionId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="create-role-form">
      <div className="form-group">
        <label>Rollenname:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="form-input"
          required
        />
      </div>

      <div className="form-group">
        <label>Beschreibung:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="form-textarea"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Berechtigungen:</label>
        <div className="permissions-selection">
          {permissions.map(permission => (
            <label key={permission.id} className="permission-checkbox">
              <input
                type="checkbox"
                checked={formData.selectedPermissions.includes(permission.id)}
                onChange={() => handlePermissionToggle(permission.id)}
              />
              <span className="permission-label">
                <strong>{permission.action}:{permission.resource}</strong>
                <small>{permission.description}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Abbrechen
        </button>
        <button type="submit" className="btn btn-primary">
          {role ? 'Aktualisieren' : 'Erstellen'}
        </button>
      </div>
    </form>
  );
};

export default RolesPage;
