import React, { useState, useEffect, useRef } from 'react';
import '../styles/SupportPages.css';

// Interfaces
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

interface UserAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onUserSelected: (user: SupportUser) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const UserAutocomplete: React.FC<UserAutocompleteProps> = ({
  value,
  onChange,
  onUserSelected,
  placeholder = "Name oder E-Mail eingeben...",
  disabled = false,
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<SupportUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(value.trim());
      }, 300); // 300ms Debounce
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value]);

  // User-Suche API-Call
  const searchUsers = async (query: string) => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('Keine Authentifizierung gefunden');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/support/users/search?q=${encodeURIComponent(query)}&limit=8`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setSuggestions(result.data);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        console.warn('User-Suche fehlgeschlagen:', result.message);
        setSuggestions([]);
        setShowSuggestions(false);
      }

    } catch (error) {
      console.error('Fehler bei User-Suche:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Input-Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  // User-Selection Handler
  const handleUserSelect = (user: SupportUser) => {
    onChange(user.displayName);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onUserSelected(user);
  };

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleUserSelect(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Source Icon Helper
  const getSourceIcon = (source: SupportUser['source']) => {
    switch (source) {
      case 'entra': return '🏢';
      case 'ldap': return '🗂️';
      case 'upload': return '📊';
      case 'manual': return '✋';
      default: return '👤';
    }
  };

  return (
    <div className={`user-autocomplete ${className}`}>
      <div className="autocomplete-input-container">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`form-input ${isLoading ? 'loading' : ''}`}
          autoComplete="off"
        />
        {isLoading && (
          <div className="autocomplete-spinner">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="autocomplete-suggestions">
          {suggestions.map((user, index) => (
            <div
              key={user.id}
              className={`autocomplete-suggestion ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleUserSelect(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="suggestion-main">
                <div className="suggestion-header">
                  <span className="suggestion-name">{user.displayName}</span>
                  <span className="suggestion-source">{getSourceIcon(user.source)}</span>
                </div>
                <div className="suggestion-email">{user.email}</div>
                {(user.department || user.location) && (
                  <div className="suggestion-details">
                    {user.department && <span className="suggestion-department">{user.department}</span>}
                    {user.location && <span className="suggestion-location">📍 {user.location}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !isLoading && value.trim().length >= 2 && (
        <div ref={suggestionsRef} className="autocomplete-suggestions">
          <div className="autocomplete-no-results">
            <span>Keine Mitarbeiter gefunden für "{value}"</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAutocomplete;
