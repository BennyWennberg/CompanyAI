import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Entra ID OAuth Callback Handler
 * Verarbeitet den Rückruf von Microsoft nach OAuth-Authentifizierung
 */
const EntraCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verarbeite Microsoft-Anmeldung...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Fehler von Microsoft OAuth prüfen
        if (error) {
          console.error('OAuth Error:', error, errorDescription);
          setStatus('error');
          setMessage(`Microsoft-Anmeldung fehlgeschlagen: ${errorDescription || error}`);
          setTimeout(() => navigate('/login'), 5000);
          return;
        }

        // Authorization Code prüfen
        if (!code) {
          setStatus('error');
          setMessage('Kein Authorization Code von Microsoft erhalten');
          setTimeout(() => navigate('/login'), 5000);
          return;
        }

        console.log('🔐 Processing Entra callback with code:', code?.substring(0, 10) + '...');

        // Authorization Code an Backend senden
        const response = await fetch('http://localhost:5000/api/auth/entra-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state })
        });

        console.log(`📡 Backend Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          // HTTP-Fehler (401, 500, etc.)
          const errorResult = await response.json().catch(() => ({}));
          console.error('HTTP Fehler:', response.status, errorResult);
          
          setStatus('error');
          setMessage(errorResult.message || `Server-Fehler (${response.status}): ${response.statusText}`);
          setTimeout(() => navigate('/login'), 5000);
          return;
        }

        const result = await response.json();

        if (result.success && result.token) {
          // Erfolgreiche Authentifizierung
          console.log('✅ Entra authentication successful');
          
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('userRole', result.user?.role || 'USER');
          localStorage.setItem('userName', result.user?.name || result.user?.email || 'Microsoft User');
          
          setStatus('success');
          setMessage('Anmeldung erfolgreich! Weiterleitung...');
          
          // Weiterleitung zur Hauptseite
          setTimeout(() => navigate('/'), 2000);
        } else {
          // Backend-Fehler
          console.error('Backend authentication failed:', result);
          setStatus('error');
          setMessage(result.message || 'Backend-Authentifizierung fehlgeschlagen');
          setTimeout(() => navigate('/login'), 5000);
        }

      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setMessage('Verbindungsfehler zum Backend');
        setTimeout(() => navigate('/login'), 5000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return '#2563eb';
      case 'success': return '#059669';
      case 'error': return '#dc2626';
      default: return '#64748b';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Segoe UI', 'Roboto', sans-serif"
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '48px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: status === 'loading' ? 'spin 2s linear infinite' : 'none'
        }}>
          {getStatusIcon()}
        </div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '16px'
        }}>
          Microsoft Entra ID
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: getStatusColor(),
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>
          {message}
        </p>

        {status === 'loading' && (
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#e2e8f0',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#2563eb',
              borderRadius: '2px',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
          </div>
        )}

        {status === 'error' && (
          <div style={{
            marginTop: '24px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '14px'
          }}>
            Sie werden in 5 Sekunden zur Anmeldung zurückgeleitet...
          </div>
        )}

        {status === 'success' && (
          <div style={{
            marginTop: '24px',
            padding: '12px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#166534',
            fontSize: '14px'
          }}>
            Weiterleitung zum Dashboard in 2 Sekunden...
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default EntraCallbackPage;
