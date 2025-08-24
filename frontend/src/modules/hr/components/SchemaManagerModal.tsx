import React, { useState, useEffect } from 'react';

interface FieldSchema {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  category: string;
  unit?: string;
  required: boolean;
  defaultValue?: string;
  selectOptions?: string[];
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

interface CreateFieldSchemaRequest {
  name: string;
  type: FieldSchema['type'];
  category: string;
  unit?: string;
  required: boolean;
  defaultValue?: string;
  selectOptions?: string[];
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface SchemaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemasUpdated: () => void;
}

const SchemaManagerModal: React.FC<SchemaManagerModalProps> = ({
  isOpen,
  onClose,
  onSchemasUpdated
}) => {
  const [schemas, setSchemas] = useState<FieldSchema[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [newSchema, setNewSchema] = useState({
    name: '',
    type: 'text' as FieldSchema['type'],
    category: 'HR',
    unit: '',
    required: false,
    defaultValue: '',
    selectOptions: ['']
  });

  // Initialize categories mit Default-Werten
  useEffect(() => {
    if (categories.length === 0) {
      setCategories(['HR', 'Finanzen', 'Personal', 'Legal', 'IT', 'Sonstiges']);
    }
  }, []);

  // UI State
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSchemas();
      loadCategories();
    }
  }, [isOpen]);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch('http://localhost:5000/api/hr/field-schemas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: APIResponse<FieldSchema[]> = await response.json();
      if (result.success && result.data) {
        setSchemas(result.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    // Fallback-Kategorien setzen falls Backend nicht verfügbar
    const fallbackCategories = ['HR', 'Finanzen', 'Personal', 'Legal', 'IT', 'Sonstiges'];
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/hr/field-schemas/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: APIResponse<string[]> = await response.json();
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        setCategories(fallbackCategories);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
      // Fallback verwenden wenn Backend nicht erreichbar
      setCategories(fallbackCategories);
    }
  };

  const handleSaveSchema = async () => {
    if (!newSchema.name.trim()) {
      alert('Feld-Name ist erforderlich');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');

      const requestData: CreateFieldSchemaRequest = {
        name: newSchema.name.trim(),
        type: newSchema.type,
        category: newSchema.category,
        unit: newSchema.unit.trim() || undefined,
        required: newSchema.required,
        defaultValue: newSchema.defaultValue.trim() || undefined,
        selectOptions: newSchema.type === 'select' ? 
          newSchema.selectOptions.filter(opt => opt.trim() !== '') : undefined
      };

      const response = await fetch('http://localhost:5000/api/hr/field-schemas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result: APIResponse<FieldSchema> = await response.json();
      
      if (result.success) {
        await loadSchemas();
        setNewSchema({
          name: '',
          type: 'text',
          category: 'HR',
          unit: '',
          required: false,
          defaultValue: '',
          selectOptions: ['']
        });
        setShowForm(false);
        onSchemasUpdated();
      } else {
        alert(result.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Verbindungsfehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchema = async (schemaId: string, schemaName: string) => {
    if (!confirm(`Schema "${schemaName}" wirklich löschen?\n\nAlle Benutzer-Werte für dieses Feld gehen verloren!`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/hr/field-schemas/${schemaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: APIResponse<void> = await response.json();
      if (result.success) {
        await loadSchemas();
        onSchemasUpdated();
      } else {
        alert(result.message || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Verbindungsfehler beim Löschen');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'number': return '🔢';
      case 'date': return '📅';
      case 'select': return '📋';
      case 'boolean': return '☑️';
      default: return '📎';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'HR': '#10b981',
      'Finanzen': '#f59e0b',
      'Personal': '#3b82f6',
      'Legal': '#8b5cf6',
      'IT': '#ef4444',
      'Sonstiges': '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  const addSelectOption = () => {
    setNewSchema(prev => ({
      ...prev,
      selectOptions: [...prev.selectOptions, '']
    }));
  };

  const updateSelectOption = (index: number, value: string) => {
    setNewSchema(prev => ({
      ...prev,
      selectOptions: prev.selectOptions.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeSelectOption = (index: number) => {
    if (newSchema.selectOptions.length > 1) {
      setNewSchema(prev => ({
        ...prev,
        selectOptions: prev.selectOptions.filter((_, i) => i !== index)
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content schema-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Zusatzinformationen verwalten</h2>
          <p>Feldtypen für alle Mitarbeiter definieren</p>
          <button className="modal-close" onClick={onClose}>✖️</button>
        </div>

        <div className="modal-body">
          {/* Existing Schemas */}
          <div className="existing-schemas-section">
            <div className="section-header">
              <h3>🏷️ Verfügbare Feldtypen</h3>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
                disabled={showForm}
              >
                ➕ Neues Feld hinzufügen
              </button>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Lade Schemas...</p>
              </div>
            ) : schemas.length === 0 ? (
              <div className="empty-state">
                <p>Noch keine Feldtypen definiert</p>
              </div>
            ) : (
              <div className="schemas-grid">
                {schemas.map((schema) => (
                  <div key={schema.id} className="schema-card">
                    <div className="schema-header">
                      <span className="schema-icon">{getTypeIcon(schema.type)}</span>
                      <span className="schema-name">{schema.name}</span>
                      <span 
                        className="schema-category-badge" 
                        style={{ backgroundColor: getCategoryColor(schema.category) }}
                      >
                        {schema.category}
                      </span>
                    </div>
                    <div className="schema-details">
                      <div className="schema-type">Typ: {schema.type}</div>
                      {schema.unit && <div className="schema-unit">Einheit: {schema.unit}</div>}
                      {schema.required && <div className="schema-required">✅ Erforderlich</div>}
                      {schema.defaultValue && <div className="schema-default">Standard: {schema.defaultValue}</div>}
                    </div>
                    <div className="schema-actions">
                      <button 
                        className="btn-icon delete" 
                        onClick={() => handleDeleteSchema(schema.id, schema.name)}
                        title="Löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Schema Form */}
          {showForm && (
            <div className="new-schema-form">
              <div className="section-header">
                <h3>➕ Neues Feld hinzufügen</h3>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  ❌ Abbrechen
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Feld-Name:</label>
                  <input
                    type="text"
                    value={newSchema.name}
                    onChange={(e) => setNewSchema(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Gehalt, Führerschein..."
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Typ:</label>
                  <select
                    value={newSchema.type}
                    onChange={(e) => setNewSchema(prev => ({ ...prev, type: e.target.value as FieldSchema['type'] }))}
                    className="form-select"
                  >
                    <option value="text">📝 Text</option>
                    <option value="number">🔢 Zahl</option>
                    <option value="date">📅 Datum</option>
                    <option value="select">📋 Auswahl</option>
                    <option value="boolean">☑️ Ja/Nein</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Kategorie:</label>
                  <select
                    value={newSchema.category}
                    onChange={(e) => setNewSchema(prev => ({ ...prev, category: e.target.value }))}
                    className="form-select"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {(newSchema.type === 'number') && (
                  <div className="form-group">
                    <label>Einheit (optional):</label>
                    <input
                      type="text"
                      value={newSchema.unit}
                      onChange={(e) => setNewSchema(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="z.B. €, Tage, %..."
                      className="form-input"
                    />
                  </div>
                )}

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newSchema.required}
                      onChange={(e) => setNewSchema(prev => ({ ...prev, required: e.target.checked }))}
                    />
                    Erforderliches Feld
                  </label>
                </div>

                <div className="form-group">
                  <label>Standard-Wert (optional):</label>
                  {newSchema.type === 'boolean' ? (
                    <select
                      value={newSchema.defaultValue}
                      onChange={(e) => setNewSchema(prev => ({ ...prev, defaultValue: e.target.value }))}
                      className="form-select"
                    >
                      <option value="">Kein Standard</option>
                      <option value="true">✅ Ja</option>
                      <option value="false">❌ Nein</option>
                    </select>
                  ) : newSchema.type === 'date' ? (
                    <input
                      type="date"
                      value={newSchema.defaultValue}
                      onChange={(e) => setNewSchema(prev => ({ ...prev, defaultValue: e.target.value }))}
                      className="form-input"
                    />
                  ) : (
                    <input
                      type={newSchema.type === 'number' ? 'number' : 'text'}
                      value={newSchema.defaultValue}
                      onChange={(e) => setNewSchema(prev => ({ ...prev, defaultValue: e.target.value }))}
                      placeholder="Standard-Wert..."
                      className="form-input"
                    />
                  )}
                </div>

                {/* Select Options */}
                {newSchema.type === 'select' && (
                  <div className="form-group full-width">
                    <label>Auswahlmöglichkeiten:</label>
                    <div className="select-options">
                      {newSchema.selectOptions.map((option, index) => (
                        <div key={index} className="option-row">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateSelectOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="form-input"
                          />
                          <button
                            type="button"
                            className="btn-icon delete"
                            onClick={() => removeSelectOption(index)}
                            disabled={newSchema.selectOptions.length === 1}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={addSelectOption}
                      >
                        ➕ Option hinzufügen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveSchema}
                  disabled={saving || !newSchema.name.trim()}
                >
                  {saving ? '💾 Speichert...' : '➕ Schema erstellen'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  ❌ Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-stats">
            <span>📊 {schemas.length} Feldtypen</span>
            <span>🏷️ {Array.from(new Set(schemas.map(s => s.category))).length} Kategorien</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchemaManagerModal;
