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
}

interface AdditionalInfoField {
  schema: FieldSchema;
  value?: string;
  hasValue: boolean;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AdditionalInfoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onValuesUpdated: () => void;
}

const AdditionalInfoEditor: React.FC<AdditionalInfoEditorProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onValuesUpdated
}) => {
  const [fields, setFields] = useState<AdditionalInfoField[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State - Map von schemaId zu Wert
  const [formValues, setFormValues] = useState<{ [schemaId: string]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      loadAdditionalInfo();
    }
  }, [isOpen, employeeId]);

  const loadAdditionalInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}/additional-info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: APIResponse<AdditionalInfoField[]> = await response.json();
      if (result.success && result.data) {
        setFields(result.data);
        
        // Form Values initialisieren
        const initialValues: { [schemaId: string]: string } = {};
        result.data.forEach(field => {
          initialValues[field.schema.id] = field.value || '';
        });
        setFormValues(initialValues);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zusatzinformationen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (schemaId: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [schemaId]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');

      // Nur geänderte Werte senden
      const values = Object.entries(formValues).map(([schemaId, value]) => ({
        schemaId,
        value
      }));

      const requestData = { values };

      const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}/additional-info`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result: APIResponse<AdditionalInfoField[]> = await response.json();
      
      if (result.success) {
        await loadAdditionalInfo();
        setHasChanges(false);
        onValuesUpdated();
        onClose();
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

  const handleCancel = () => {
    if (hasChanges && !confirm('Ungespeicherte Änderungen verwerfen?')) {
      return;
    }
    onClose();
  };

  const formatValue = (value: string, schema: FieldSchema): string => {
    if (!value) return '-';
    
    switch (schema.type) {
      case 'boolean':
        return value === 'true' ? '✅ Ja' : '❌ Nein';
      case 'number':
        return schema.unit ? `${value} ${schema.unit}` : value;
      case 'date':
        return new Date(value).toLocaleDateString('de-DE');
      default:
        return value;
    }
  };

  const renderFormInput = (field: AdditionalInfoField) => {
    const { schema } = field;
    const value = formValues[schema.id] || '';

    const baseInputProps = {
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => 
        handleValueChange(schema.id, e.target.value),
      className: 'form-input'
    };

    switch (schema.type) {
      case 'boolean':
        return (
          <select {...baseInputProps}>
            <option value="">Nicht gesetzt</option>
            <option value="true">✅ Ja</option>
            <option value="false">❌ Nein</option>
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            {...baseInputProps}
          />
        );

      case 'number':
        return (
          <div className="number-input-group">
            <input
              type="number"
              {...baseInputProps}
              placeholder="Wert eingeben..."
            />
            {schema.unit && <span className="input-unit">{schema.unit}</span>}
          </div>
        );

      case 'select':
        return (
          <select {...baseInputProps}>
            <option value="">Bitte auswählen</option>
            {schema.selectOptions?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      default: // text
        return (
          <input
            type="text"
            {...baseInputProps}
            placeholder="Wert eingeben..."
          />
        );
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content additional-info-editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Zusatzinformationen bearbeiten</h2>
          <p>Mitarbeiter: <strong>{employeeName}</strong></p>
          <button className="modal-close" onClick={handleCancel}>✖️</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Lade Zusatzinformationen...</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="empty-state">
              <h3>📭 Keine Zusatzinformationen definiert</h3>
              <p>Es sind noch keine Feldtypen definiert. Verwende den "📊 Zusätzliche Informationen" Button, um Feldtypen zu erstellen.</p>
            </div>
          ) : (
            <div className="fields-form">
              <h3>📊 Verfügbare Felder</h3>
              <div className="fields-grid">
                {fields.map((field) => (
                  <div key={field.schema.id} className="field-form-group">
                    <div className="field-label">
                      <span className="field-icon">{getTypeIcon(field.schema.type)}</span>
                      <span className="field-name">{field.schema.name}</span>
                      {field.schema.required && <span className="required-indicator">*</span>}
                      <span 
                        className="field-category-small" 
                        style={{ backgroundColor: getCategoryColor(field.schema.category) }}
                      >
                        {field.schema.category}
                      </span>
                    </div>
                    <div className="field-input">
                      {renderFormInput(field)}
                    </div>
                    {field.schema.defaultValue && (
                      <div className="field-hint">
                        Standard: {formatValue(field.schema.defaultValue, field.schema)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-stats">
            <span>📊 {fields.length} Felder</span>
            <span>🏷️ {Array.from(new Set(fields.map(f => f.schema.category))).length} Kategorien</span>
            {hasChanges && <span className="changes-indicator">✏️ Änderungen vorhanden</span>}
          </div>
          <div className="modal-actions">
            <button 
              className="btn btn-secondary" 
              onClick={handleCancel}
              disabled={saving}
            >
              ❌ Abbrechen
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? '💾 Speichert...' : '💾 Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoEditor;
