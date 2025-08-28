import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAutocomplete from '../components/UserAutocomplete';
import '../styles/SupportPages.css';

interface CreateTicketData {
  title: string;
  description: string;
  category: 'hardware' | 'software' | 'network' | 'access' | 'phone' | 'other' | '';
  priority: 'low' | 'medium' | 'high' | 'urgent' | '';
  customerId: string;
  customerEmail: string;
  customerName?: string;
  location?: string;
  deviceInfo?: string;
}

// Support User Interface (entspricht Backend)
interface SupportUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  department?: string;
  location?: string;
  source: 'entra' | 'ldap' | 'upload' | 'manual';
}

const CreateTicketPage: React.FC = () => {
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    category: '',
    priority: '',
    customerId: '',
    customerEmail: '',
    customerName: '',
    location: '',
    deviceInfo: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // State für User-Autocomplete
  const [userSearchValue, setUserSearchValue] = useState('');
  
  const navigate = useNavigate();

  const categoryOptions = [
    { value: 'hardware', label: 'Hardware', icon: '🖥️', description: 'Computer, Laptops, Drucker, Monitor-Probleme' },
    { value: 'software', label: 'Software', icon: '💻', description: 'Programme, Apps, Installationen, Updates' },
    { value: 'network', label: 'Netzwerk', icon: '🌐', description: 'Internet, WLAN, VPN, Server-Zugang' },
    { value: 'access', label: 'Zugriff', icon: '🔐', description: 'Passwörter, Berechtigungen, Account-Probleme' },
    { value: 'phone', label: 'Telefon', icon: '📞', description: 'Telefon, Durchwahlen, Voicemail-Probleme' },
    { value: 'other', label: 'Sonstige', icon: '📋', description: 'Andere IT-Probleme oder Anfragen' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Niedrig', description: 'Unkritische Anfragen' },
    { value: 'medium', label: 'Mittel', description: 'Standard-Support-Anfragen' },
    { value: 'high', label: 'Hoch', description: 'Wichtige Probleme' },
    { value: 'urgent', label: 'Dringend', description: 'Kritische Ausfälle' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Titel muss mindestens 5 Zeichen lang sein';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Beschreibung ist erforderlich';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Beschreibung muss mindestens 10 Zeichen lang sein';
    }

    if (!formData.category) {
      newErrors.category = 'Kategorie ist erforderlich';
    }

    if (!formData.priority) {
      newErrors.priority = 'Priorität ist erforderlich';
    }

    if (!formData.customerId.trim()) {
      newErrors.customerId = 'Kunden-ID ist erforderlich';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Ungültige E-Mail-Adresse';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Keine Authentifizierung gefunden');
        return;
      }

      const response = await fetch('http://localhost:5000/api/support/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          customerId: formData.customerId.trim(),
          customerEmail: formData.customerEmail.trim(),
          customerName: formData.customerName?.trim() || '',
          location: formData.location?.trim() || '',
          deviceInfo: formData.deviceInfo?.trim() || ''
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Ticket erfolgreich erstellt!');
        navigate('/support/tickets');
      } else {
        alert('Fehler beim Erstellen des Tickets: ' + result.message);
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des Tickets:', err);
      alert('Verbindungsfehler beim Erstellen des Tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTicketData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handler für User-Auswahl aus Autocomplete
  const handleUserSelected = (user: SupportUser) => {
    // Automatisches Ausfüllen der Felder
    setFormData(prev => ({
      ...prev,
      customerId: user.id,
      customerEmail: user.email,
      customerName: user.displayName,
      location: user.location || user.department || ''
    }));
    
    // Clear Fehler
    setErrors(prev => ({
      ...prev,
      customerId: '',
      customerEmail: '',
      customerName: ''
    }));
  };

  return (
    <div className="support-page">
      <div className="page-header">
        <div className="page-title">
          <h1>➕ Neues Support-Ticket</h1>
          <p>Erstellen Sie ein neues Support-Ticket für Kundenanfragen</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/support/tickets')}
          >
            ← Zurück zu Tickets
          </button>
        </div>
      </div>

      <div className="content-section">
        <form onSubmit={handleSubmit} className="create-ticket-form">
          
          {/* Ticket Information */}
          <div className="form-section">
            <h3>📝 Ticket-Informationen</h3>
            
            <div className="form-row single">
              <div className="form-group">
                <label className="form-label">Titel*</label>
                <input
                  type="text"
                  className={`form-input ${errors.title ? 'error' : ''}`}
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Kurze Beschreibung des Problems"
                  maxLength={200}
                />
                {errors.title && <div className="form-error">{errors.title}</div>}
                <div className="form-help">
                  Geben Sie eine prägnante Zusammenfassung des Problems ein
                </div>
              </div>
            </div>

            <div className="form-row single">
              <div className="form-group">
                <label className="form-label">Beschreibung*</label>
                <textarea
                  className={`form-textarea ${errors.description ? 'error' : ''}`}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detaillierte Beschreibung des Problems..."
                  maxLength={2000}
                />
                {errors.description && <div className="form-error">{errors.description}</div>}
                <div className="form-help">
                  Beschreiben Sie das Problem so detailliert wie möglich
                </div>
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="form-section">
            <h3>🏷️ Kategorie*</h3>
            <div className="category-grid">
              {categoryOptions.map((option) => (
                <div
                  key={option.value}
                  className={`category-option ${formData.category === option.value ? 'selected' : ''}`}
                  onClick={() => handleInputChange('category', option.value)}
                >
                  <span className="category-icon">{option.icon}</span>
                  <div className="category-name">{option.label}</div>
                  <div className="category-description">{option.description}</div>
                </div>
              ))}
            </div>
            {errors.category && <div className="form-error">{errors.category}</div>}
          </div>

          {/* Priority Selection */}
          <div className="form-section">
            <h3>⚡ Priorität*</h3>
            <div className="priority-grid">
              {priorityOptions.map((option) => (
                <div
                  key={option.value}
                  className={`priority-option ${formData.priority === option.value ? 'selected' : ''} priority-${option.value}`}
                  onClick={() => handleInputChange('priority', option.value)}
                >
                  <div className="priority-label">{option.label}</div>
                  <div className="priority-description">{option.description}</div>
                </div>
              ))}
            </div>
            {errors.priority && <div className="form-error">{errors.priority}</div>}
          </div>

          {/* Customer Information */}
          <div className="form-section">
            <h3>👤 Mitarbeiter-Informationen</h3>
            
            {/* User Search with Autocomplete */}
            <div className="form-group">
              <label className="form-label">🔍 Mitarbeiter suchen</label>
              <UserAutocomplete
                value={userSearchValue}
                onChange={setUserSearchValue}
                onUserSelected={handleUserSelected}
                placeholder="Name oder E-Mail-Adresse eingeben..."
                disabled={loading}
                className=""
              />
              <div className="form-help">
                Beginnen Sie mit der Eingabe eines Namens oder einer E-Mail-Adresse, um Mitarbeiter zu finden.
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mitarbeiter-ID*</label>
                <input
                  type="text"
                  className={`form-input ${errors.customerId ? 'error' : ''}`}
                  value={formData.customerId}
                  onChange={(e) => handleInputChange('customerId', e.target.value)}
                  placeholder="z.B. emp_12345"
                />
                {errors.customerId && <div className="form-error">{errors.customerId}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">E-Mail-Adresse*</label>
                <input
                  type="email"
                  className={`form-input ${errors.customerEmail ? 'error' : ''}`}
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="mitarbeiter@company.com"
                />
                {errors.customerEmail && <div className="form-error">{errors.customerEmail}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.customerName || ''}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Max Mustermann"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Standort/Abteilung</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Büro 2.15, IT-Abteilung"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Geräteinformationen</label>
              <input
                type="text"
                className="form-input"
                value={formData.deviceInfo || ''}
                onChange={(e) => handleInputChange('deviceInfo', e.target.value)}
                placeholder="ThinkPad X1 Carbon, Service-Tag: ABC123"
              />
              <div className="form-help">
                Informationen zum betroffenen Gerät (optional, bei Hardware-Problemen hilfreich)
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/support/tickets')}
              disabled={loading}
            >
              Abbrechen
            </button>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Wird erstellt...' : '✅ Ticket erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketPage;
