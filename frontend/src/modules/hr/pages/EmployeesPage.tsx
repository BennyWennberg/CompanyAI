import React, { useState, useEffect } from 'react';
import '../styles/HRPages.css';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  startDate: string;
  status: 'active' | 'inactive' | 'pending';
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    loadEmployees();
  }, [filters]);

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
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '20');

      const response = await fetch(`http://localhost:5000/api/hr/employees?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: APIResponse<PaginatedResponse<Employee>> = await response.json();

      if (result.success && result.data) {
        let employeeData = result.data.data;

        // Client-side Search Filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          employeeData = employeeData.filter(emp =>
            emp.firstName.toLowerCase().includes(searchTerm) ||
            emp.lastName.toLowerCase().includes(searchTerm) ||
            emp.email.toLowerCase().includes(searchTerm)
          );
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

  const getStatusBadge = (status: Employee['status']) => {
    const statusMap = {
      active: { label: 'Aktiv', class: 'status-active' },
      inactive: { label: 'Inaktiv', class: 'status-inactive' },
      pending: { label: 'Ausstehend', class: 'status-pending' }
    };
    return statusMap[status] || { label: status, class: 'status-unknown' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
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

  return (
    <div className="hr-page">
      <div className="page-header">
        <div className="page-title">
          <h1>👥 Mitarbeiter-Verwaltung</h1>
          <p>Zentrale Verwaltung aller Mitarbeiterinformationen</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary">
            ➕ Neuer Mitarbeiter
          </button>
        </div>
      </div>

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
              <option value="IT">IT</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
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
          <div className="employees-grid">
            {employees.map((employee) => (
              <div key={employee.id} className="employee-card">
                <div className="employee-header">
                  <div className="employee-avatar">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                  <div className="employee-basic">
                    <h3>{employee.firstName} {employee.lastName}</h3>
                    <p className="employee-email">{employee.email}</p>
                  </div>
                  <div className={`status-badge ${getStatusBadge(employee.status).class}`}>
                    {getStatusBadge(employee.status).label}
                  </div>
                </div>
                
                <div className="employee-details">
                  <div className="detail-row">
                    <span className="detail-icon">{getDepartmentIcon(employee.department)}</span>
                    <span className="detail-label">Abteilung:</span>
                    <span className="detail-value">{employee.department}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-icon">💼</span>
                    <span className="detail-label">Position:</span>
                    <span className="detail-value">{employee.position}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-icon">📅</span>
                    <span className="detail-label">Startdatum:</span>
                    <span className="detail-value">{formatDate(employee.startDate)}</span>
                  </div>
                </div>
                
                <div className="employee-actions">
                  <button className="btn btn-small btn-secondary">
                    👁️ Details
                  </button>
                  <button className="btn btn-small btn-primary">
                    ✏️ Bearbeiten
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && !error && (
        <div className="page-summary">
          <p>
            <strong>{employees.length}</strong> Mitarbeiter angezeigt
            {filters.department && ` in ${filters.department}`}
            {filters.status && ` mit Status "${getStatusBadge(filters.status as Employee['status']).label}"`}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
