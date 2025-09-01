import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import TicketChat from '../components/TicketChat';
import '../styles/SupportPages.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'hardware' | 'software' | 'network' | 'access' | 'phone' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  customerId: string;
  customerEmail: string;
  customerName?: string;
  assignedTo?: string;
  location?: string;
  deviceInfo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: 'internal_note' | 'status_change' | 'assignment';
  isInternal: boolean;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    oldAssignedTo?: string;
    newAssignedTo?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface TicketWithComments extends Ticket {
  comments: TicketComment[];
}

const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<TicketWithComments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State für Chat-Funktionen
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicketDetails();
    }
  }, [ticketId]);

  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Keine Authentifizierung gefunden');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/support/tickets/${ticketId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setTicket(result.data);
      } else {
        setError(result.message || 'Fehler beim Laden der Ticket-Details');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der Ticket-Details:', err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !ticketId) return;

    try {
      setCommentLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`http://localhost:5000/api/support/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment.trim(),
          type: 'internal_note'
        })
      });

      const result = await response.json();

      if (result.success) {
        setNewComment('');
        await loadTicketDetails(); // Ticket neu laden für aktualisierte Kommentare
      } else {
        alert('Fehler beim Hinzufügen des Kommentars: ' + result.message);
      }
    } catch (err) {
      console.error('Fehler beim Hinzufügen des Kommentars:', err);
      alert('Verbindungsfehler beim Hinzufügen des Kommentars');
    } finally {
      setCommentLoading(false);
    }
  };

  // Chat-Message senden (für neue Chat-Funktionalität)
  const handleSendChatMessage = async (content: string, type: 'user_message' | 'internal_note') => {
    try {
      setCommentLoading(true);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Keine Authentifizierung gefunden');
      }

      const response = await fetch(`http://localhost:5000/api/support/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          type: type
        })
      });

      const result = await response.json();

      if (result.success) {
        // Ticket-Details neu laden um aktualisierte Chat-Nachrichten anzuzeigen
        await loadTicketDetails();
      } else {
        throw new Error(result.message || 'Fehler beim Senden der Nachricht');
      }

    } catch (error) {
      console.error('Fehler beim Senden der Chat-Nachricht:', error);
      throw error; // Chat-Komponente kann Fehler selbst behandeln
    } finally {
      setCommentLoading(false);
    }
  };

  const updateTicketStatus = async (newStatus: Ticket['status']) => {
    if (!ticketId) return;

    try {
      const token = localStorage.getItem('authToken');
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
        await loadTicketDetails(); // Ticket neu laden
      } else {
        alert('Fehler beim Aktualisieren des Status: ' + result.message);
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Status:', err);
      alert('Verbindungsfehler beim Aktualisieren');
    }
  };

  const getCategoryIcon = (category: Ticket['category']) => {
    const icons = {
      hardware: '🖥️',
      software: '💻',
      network: '🌐',
      access: '🔐',
      phone: '📞',
      other: '📋'
    };
    return icons[category] || '📋';
  };

  const getCategoryLabel = (category: Ticket['category']) => {
    const labels = {
      hardware: 'Hardware',
      software: 'Software',
      network: 'Netzwerk',
      access: 'Zugriff',
      phone: 'Telefon',
      other: 'Sonstige'
    };
    return labels[category] || category;
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

  const getStatusLabel = (status: Ticket['status']) => {
    const labels = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      waiting_customer: 'Wartet auf Mitarbeiter',
      resolved: 'Gelöst',
      closed: 'Geschlossen'
    };
    return labels[status] || status;
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

  const getCommentTypeIcon = (type: TicketComment['type']) => {
    const icons = {
      internal_note: '📝',
      status_change: '🔄',
      assignment: '👤'
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <div className="support-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Ticket-Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="support-page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Fehler beim Laden</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadTicketDetails}>
            🔄 Erneut versuchen
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/support/tickets')}>
            ← Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="support-page">
        <div className="empty-state">
          <div className="empty-icon">🎫</div>
          <h3>Ticket nicht gefunden</h3>
          <p>Das angeforderte Ticket konnte nicht gefunden werden.</p>
          <button className="btn btn-primary" onClick={() => navigate('/support/tickets')}>
            ← Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="support-page ticket-detail-page">
      {/* Header mit Ticket-Info */}
      <div className="page-header">
        <div className="page-title">
          <div className="ticket-header-info">
            <span className="category-icon">{getCategoryIcon(ticket.category)}</span>
            <div>
              <h1>Ticket #{ticket.id}</h1>
              <p className="ticket-title">{ticket.title}</p>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/support/tickets')}
          >
            ← Zurück zur Übersicht
          </button>
        </div>
      </div>

      {/* Ticket-Meta-Informationen */}
      <div className="ticket-meta-section">
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Status:</span>
            <span className={`status-badge status-${ticket.status.replace('_', '-')}`}>
              {getStatusLabel(ticket.status)}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Priorität:</span>
            <span className={`priority-badge priority-${ticket.priority}`}>
              {getPriorityLabel(ticket.priority)}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Kategorie:</span>
            <span className="info-value">{getCategoryLabel(ticket.category)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Erstellt:</span>
            <span className="info-value">{formatDate(ticket.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Mitarbeiter-Informationen */}
      <div className="content-section">
        <div className="section-card">
          <h3>📋 Ticket-Details</h3>
          <div className="ticket-info-grid">
            <div className="info-group">
              <h4>👤 Mitarbeiter-Informationen</h4>
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{ticket.customerName || 'Unbekannt'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">E-Mail:</span>
                <span className="info-value">{ticket.customerEmail}</span>
              </div>
              {ticket.location && (
                <div className="info-item">
                  <span className="info-label">Standort:</span>
                  <span className="info-value">{ticket.location}</span>
                </div>
              )}
            </div>
            
            {ticket.deviceInfo && (
              <div className="info-group">
                <h4>🖥️ Geräte-Informationen</h4>
                <div className="info-item">
                  <span className="info-value">{ticket.deviceInfo}</span>
                </div>
              </div>
            )}
            
            {ticket.assignedTo && (
              <div className="info-group">
                <h4>👨‍💻 Zugewiesener IT-Support</h4>
                <div className="info-item">
                  <span className="info-value">{ticket.assignedTo}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="problem-description">
            <h4>📝 Problem-Beschreibung</h4>
            <p>{ticket.description}</p>
          </div>
        </div>
      </div>

      {/* Ticket Chat - direkt nach Details */}
      <div className="content-section chat-section">
        <TicketChat
          ticketId={ticket.id}
          messages={ticket.comments}
          currentUserId="current_user" // TODO: Echte User-ID vom Auth-System
          onSendMessage={handleSendChatMessage}
          loading={loading}
        />
      </div>

      {/* Status-Aktionen - direkt unter Chat */}
      <div className="content-section status-section">
        <div className="section-card">
          <h3>🔄 Status-Aktionen</h3>
          <div className="status-actions">
            {ticket.status === 'open' && (
              <button 
                className="btn btn-primary"
                onClick={() => updateTicketStatus('in_progress')}
              >
                ▶️ Bearbeitung starten
              </button>
            )}
            
            {ticket.status === 'in_progress' && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={() => updateTicketStatus('waiting_customer')}
                >
                  ⏸️ Warten auf Mitarbeiter
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => updateTicketStatus('resolved')}
                >
                  ✅ Als gelöst markieren
                </button>
              </>
            )}
            
            {ticket.status === 'waiting_customer' && (
              <button 
                className="btn btn-primary"
                onClick={() => updateTicketStatus('in_progress')}
              >
                ▶️ Bearbeitung fortsetzen
              </button>
            )}
            
            {ticket.status === 'resolved' && (
              <button 
                className="btn btn-secondary"
                onClick={() => updateTicketStatus('closed')}
              >
                <LockClosedIcon className="inline" /> Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
