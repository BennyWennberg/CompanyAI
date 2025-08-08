import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SupportPages.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'account' | 'billing' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  customerId: string;
  customerEmail: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Keine Authentifizierung gefunden');
        return;
      }

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      params.append('limit', '50');

      const response = await fetch(`http://localhost:5000/api/support/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        let ticketData = result.data.data;

        // Client-side Search Filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          ticketData = ticketData.filter((ticket: Ticket) =>
            ticket.title.toLowerCase().includes(searchTerm) ||
            ticket.description.toLowerCase().includes(searchTerm) ||
            ticket.customerEmail.toLowerCase().includes(searchTerm)
          );
        }

        setTickets(ticketData);
      } else {
        setError(result.message || 'Fehler beim Laden der Tickets');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, status: newStatus, updatedAt: new Date().toISOString() }
            : ticket
        ));
      } else {
        alert('Fehler beim Aktualisieren des Tickets: ' + result.message);
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Ticket-Status:', err);
      alert('Verbindungsfehler beim Aktualisieren');
    }
  };

  const getCategoryIcon = (category: Ticket['category']) => {
    const icons = {
      technical: '🔧',
      account: '👤',
      billing: '💰',
      general: '📝'
    };
    return icons[category] || '📝';
  };

  const getPriorityClass = (priority: Ticket['priority']) => {
    return `priority-${priority}`;
  };

  const getStatusClass = (status: Ticket['status']) => {
    return `status-${status.replace('_', '-')}`;
  };

  const getStatusLabel = (status: Ticket['status']) => {
    const labels = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      waiting_customer: 'Wartet auf Kunde',
      resolved: 'Gelöst',
      closed: 'Geschlossen'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: Ticket['priority']) => {
    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      urgent: 'Dringend'
    };
    return labels[priority] || priority;
  };

  const getCategoryLabel = (category: Ticket['category']) => {
    const labels = {
      technical: 'Technisch',
      account: 'Account',
      billing: 'Abrechnung',
      general: 'Allgemein'
    };
    return labels[category] || category;
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
    <div className="support-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🎫 Support-Tickets</h1>
          <p>Zentrale Verwaltung aller Support-Anfragen</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/support/create')}
          >
            ➕ Neues Ticket
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
              placeholder="Titel, Beschreibung oder E-Mail..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="filter-select"
            >
              <option value="">Alle Status</option>
              <option value="open">Offen</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="waiting_customer">Wartet auf Kunde</option>
              <option value="resolved">Gelöst</option>
              <option value="closed">Geschlossen</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Kategorie:</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="filter-select"
            >
              <option value="">Alle Kategorien</option>
              <option value="technical">Technisch</option>
              <option value="account">Account</option>
              <option value="billing">Abrechnung</option>
              <option value="general">Allgemein</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Priorität:</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="filter-select"
            >
              <option value="">Alle Prioritäten</option>
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
          </div>
          
          <button 
            className="btn btn-secondary"
            onClick={() => setFilters({ status: '', category: '', priority: '', search: '' })}
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
            <p>Lade Tickets...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Fehler beim Laden</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadTickets}>
              🔄 Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <h3>Keine Tickets gefunden</h3>
            <p>Es wurden keine Tickets mit den aktuellen Filtern gefunden.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/support/create')}
            >
              ➕ Erstes Ticket erstellen
            </button>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <div className="ticket-meta">
                    <span className="ticket-id">#{ticket.id}</span>
                    <span className={`priority-badge ${getPriorityClass(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className="ticket-date">
                    {formatDate(ticket.createdAt)}
                  </div>
                </div>
                
                <div className="ticket-content">
                  <div className="ticket-title-section">
                    <span className="category-icon">{getCategoryIcon(ticket.category)}</span>
                    <h3 className="ticket-title">{ticket.title}</h3>
                  </div>
                  
                  <p className="ticket-description">
                    {ticket.description.length > 150 
                      ? ticket.description.substring(0, 150) + '...'
                      : ticket.description}
                  </p>
                </div>
                
                <div className="ticket-details">
                  <div className="ticket-info">
                    <div className="info-item">
                      <span className="info-label">Kategorie:</span>
                      <span className="info-value">{getCategoryLabel(ticket.category)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Kunde:</span>
                      <span className="info-value">{ticket.customerEmail}</span>
                    </div>
                    {ticket.assignedTo && (
                      <div className="info-item">
                        <span className="info-label">Zugewiesen an:</span>
                        <span className="info-value">{ticket.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ticket-actions">
                  {ticket.status === 'open' && (
                    <button 
                      className="btn btn-small btn-primary"
                      onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                    >
                      ▶️ Bearbeitung starten
                    </button>
                  )}
                  
                  {ticket.status === 'in_progress' && (
                    <>
                      <button 
                        className="btn btn-small btn-secondary"
                        onClick={() => updateTicketStatus(ticket.id, 'waiting_customer')}
                      >
                        ⏸️ Warten auf Kunde
                      </button>
                      <button 
                        className="btn btn-small btn-success"
                        onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                      >
                        ✅ Als gelöst markieren
                      </button>
                    </>
                  )}
                  
                  {ticket.status === 'waiting_customer' && (
                    <button 
                      className="btn btn-small btn-primary"
                      onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                    >
                      ▶️ Bearbeitung fortsetzen
                    </button>
                  )}
                  
                  {ticket.status === 'resolved' && (
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => updateTicketStatus(ticket.id, 'closed')}
                    >
                      🔒 Schließen
                    </button>
                  )}
                  
                  <button className="btn btn-small btn-outline">
                    👁️ Details
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
            <strong>{tickets.length}</strong> Tickets angezeigt
            {filters.status && ` mit Status "${getStatusLabel(filters.status as Ticket['status'])}"`}
            {filters.category && ` in Kategorie "${getCategoryLabel(filters.category as Ticket['category'])}"`}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
