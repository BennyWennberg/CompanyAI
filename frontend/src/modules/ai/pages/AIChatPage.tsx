import React, { useState, useEffect } from 'react';
import '../styles/AIPages.css';
import { downloadOriginalFile } from '../../../lib/apiClient';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: { 
    path: string; 
    chunk: string; 
    preview: string; 
    downloadUrl?: string; 
    isOriginal?: boolean;
    isWeb?: boolean;
    webUrl?: string;
  }[];
}

// NEU: Session Management Interfaces
interface ChatSession {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  folder?: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const AIChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'ollama'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.2);
  const [useRag, setUseRag] = useState(false);
  const [ragTopK, setRagTopK] = useState(5);
  
  // NEU: Session Management States
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [saveSession, setSaveSession] = useState(false);
  
  // NEU: Web-RAG States  
  const [useWebRag, setUseWebRag] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // NEU: Voice Integration States
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [speechToTextLoading, setSpeechToTextLoading] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
  const [ttsVoice, setTTSVoice] = useState<'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'>('alloy');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // NEU: Load initial data
  useEffect(() => {
    loadAvailableTags();
    loadRecentSessions();
  }, []);

  // NEU: Helper Functions für Session Management
  const loadAvailableTags = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch('/api/ai/sessions/tags', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setAvailableTags(data.data);
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Tags:', error);
    }
  };

  const loadRecentSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch('/api/ai/sessions/search?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setSessions(data.data);
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Sessions:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) { setError('Nicht authentifiziert'); return; }
      
      const response = await fetch(`/api/ai/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        const session = data.data;
        setCurrentSessionId(session.id);
        setSessionTitle(session.title);
        setSessionTags(session.tags);
        setMessages(session.messages || []);
        setProvider(session.settings.provider);
        setModel(session.settings.model);
        setTemperature(session.settings.temperature);
        setUseRag(session.settings.useRag);
        setRagTopK(session.settings.ragTopK);
        setUseWebRag(session.settings.useWebRag);
        setShowSessionHistory(false);
      } else {
        setError(data.message || 'Session konnte nicht geladen werden');
      }
    } catch (error: any) {
      setError(error.message || 'Fehler beim Laden der Session');
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setSessionTitle('');
    setSessionTags([]);
    setMessages([]);
    setSaveSession(true);
    setError(null);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const token = localStorage.getItem('authToken');
    if (!token) { setError('Nicht authentifiziert'); return; }
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true); setError(null);
    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          messages: newMessages, 
          provider, 
          model, 
          temperature, 
          rag: useRag, 
          ragTopK,
          // NEU: Session & Web-RAG Parameter
          sessionId: currentSessionId,
          saveSession: saveSession,
          sessionTitle: sessionTitle || `Chat ${new Date().toLocaleDateString('de-DE')}`,
          tags: sessionTags,
          webRag: useWebRag,
          webSearchQuery: webSearchQuery || undefined,
          websiteUrl: websiteUrl || undefined
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler');
      const content: string = data.data?.choices?.[0]?.message?.content || '[keine Antwort]';
      const sources = data?.meta?.rag?.sources as ChatMessage['sources'] | undefined;
      setMessages(prev => [...prev, { role: 'assistant', content, sources }]);

      // NEU: Automatisches TTS für Assistant-Antworten
      if (autoPlayTTS && content && content !== '[keine Antwort]') {
        // Kurze Verzögerung für bessere UX
        setTimeout(() => {
          textToSpeech(content);
        }, 500);
      }

      // NEU: Session-Info verarbeiten
      if (data.session) {
        if (data.session.created && data.session.sessionId) {
          setCurrentSessionId(data.session.sessionId);
          setSaveSession(false);
          console.log('✅ Neue Session erstellt:', data.session.sessionId);
          // Sessions neu laden
          loadRecentSessions();
        } else if (data.session.sessionId) {
          setCurrentSessionId(data.session.sessionId);
        }
        if (data.session.error) {
          console.warn('Session-Warnung:', data.session.error);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Fehler beim Senden');
    } finally { setLoading(false); }
  };

  // Download-Handler für Original-Dateien
  const handleDownloadOriginal = async (downloadUrl: string, originalPath: string) => {
    try {
      // Dateiname aus Download-URL extrahieren
      const filename = downloadUrl.split('/').pop() || '';
      // Original-Namen aus Path extrahieren  
      const originalName = originalPath.split('/').pop() || filename;
      
      console.log(`🔽 Download gestartet: ${originalName} (${filename})`);
      const success = await downloadOriginalFile(filename, originalName);
      
      if (!success) {
        setError(`Download von "${originalName}" fehlgeschlagen. Bitte versuchen Sie es erneut.`);
      } else {
        console.log(`✅ Download erfolgreich: ${originalName}`);
      }
    } catch (e: any) {
      setError(`Download-Fehler: ${e.message}`);
      console.error('Download error:', e);
    }
  };

  // NEU: Tag hinzufügen
  const addTag = (tagName: string) => {
    if (tagName.trim() && !sessionTags.includes(tagName.trim())) {
      setSessionTags([...sessionTags, tagName.trim()]);
    }
  };

  // NEU: Tag entfernen
  const removeTag = (tagName: string) => {
    setSessionTags(sessionTags.filter(tag => tag !== tagName));
  };

  // NEU: Voice Integration Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      const audioChunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: recorder.mimeType });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start(1000); // Chunk alle 1 Sekunde
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      console.log('🎤 Aufnahme gestartet');
      
    } catch (error) {
      console.error('Mikrofonzugriff fehlgeschlagen:', error);
      setError('Mikrofonzugriff verweigert. Bitte erlauben Sie Mikrofonzugriff für Voice-Features.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      console.log('🎤 Aufnahme beendet');
    }
  };

  const speechToText = async () => {
    if (!audioBlob) {
      setError('Keine Audio-Aufnahme vorhanden');
      return;
    }

    setSpeechToTextLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Nicht authentifiziert');
        return;
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'de');

      const response = await fetch('/api/ai/voice/speech-to-text', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();
      
      if (result.success && result.data?.text) {
        setInput(result.data.text);
        setAudioBlob(null); // Aufnahme zurücksetzen
        console.log('✅ Speech-to-Text erfolgreich:', result.data.text);
      } else {
        setError(result.message || 'Speech-to-Text fehlgeschlagen');
      }
      
    } catch (error: any) {
      setError('Speech-to-Text Fehler: ' + error.message);
      console.error('STT Fehler:', error);
    } finally {
      setSpeechToTextLoading(false);
    }
  };

  const textToSpeech = async (text: string) => {
    if (!text || text.trim().length === 0) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Nicht authentifiziert');
        return;
      }

      // Aktuelles Audio stoppen
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      const response = await fetch('/api/ai/voice/text-to-speech', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          text: text.substring(0, 4000), // TTS Limit beachten
          voice: ttsVoice,
          format: 'mp3',
          speed: 1.0
        })
      });

      const result = await response.json();
      
      if (result.success && result.data?.audioUrl) {
        const audio = new Audio(result.data.audioUrl);
        
        audio.onloadeddata = () => {
          console.log(`🔊 TTS Audio geladen: ${result.data.duration}s`);
        };
        
        audio.onended = () => {
          setCurrentAudio(null);
        };
        
        audio.onerror = (error) => {
          console.error('Audio-Playback Fehler:', error);
          setError('Audio-Playback fehlgeschlagen');
        };

        setCurrentAudio(audio);
        audio.play();
        
      } else {
        setError(result.message || 'Text-to-Speech fehlgeschlagen');
      }
      
    } catch (error: any) {
      setError('Text-to-Speech Fehler: ' + error.message);
      console.error('TTS Fehler:', error);
    }
  };

  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  return (
    <div className="ai-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🤖 AI Chat {currentSessionId ? `- ${sessionTitle}` : ''}</h1>
          <p>Multi-Provider Chat mit RAG + Web-Suche + Session-Verwaltung</p>
          {currentSessionId && (
            <div style={{ marginTop: 4 }}>
              {sessionTags.map(tag => (
                <span key={tag} style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: 12, 
                  fontSize: '12px',
                  marginRight: 6 
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowSessionHistory(!showSessionHistory)}>
            📚 Verlauf ({sessions.length})
          </button>
          <button className="btn btn-secondary" onClick={createNewSession}>+ Neu</button>
          <button className="btn btn-secondary" onClick={() => setMessages([])}>Leeren</button>
          {currentAudio && (
            <button className="btn btn-secondary" onClick={stopCurrentAudio}>
              🔊 Audio stoppen
            </button>
          )}
        </div>
      </div>

      <div className="content-section">
        {error && <div className="error-state"><p>{error}</p></div>}

        {/* NEU: Session History */}
        {showSessionHistory && (
          <div className="filters-section" style={{ marginBottom: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3>📚 Chat-Verlauf</h3>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {sessions.map(session => (
                <div key={session.id} style={{ 
                  padding: 8, 
                  borderBottom: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  backgroundColor: session.id === currentSessionId ? '#dbeafe' : 'transparent'
                }} onClick={() => loadSession(session.id)}>
                  <div style={{ fontWeight: 'bold' }}>{session.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {session.messageCount} Nachrichten • {new Date(session.updatedAt).toLocaleDateString('de-DE')}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    {session.tags.map(tag => (
                      <span key={tag} style={{ 
                        backgroundColor: '#e5e7eb', 
                        padding: '1px 6px', 
                        borderRadius: 8, 
                        fontSize: '11px',
                        marginRight: 4 
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="filters-section" style={{ marginBottom: 16 }}>
          {/* Erste Zeile: Provider & Model */}
          <div className="filters-row">
            <div className="filter-group">
              <label>Provider</label>
              <select className="filter-select" value={provider} onChange={e => setProvider(e.target.value as any)}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="ollama">Ollama/Llama</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Model</label>
              <input className="filter-input" value={model} onChange={e => setModel(e.target.value)} placeholder="z.B. gpt-4o-mini / gemini-1.5-flash / llama3" />
            </div>
            <div className="filter-group">
              <label>Temperatur: {temperature.toFixed(2)}</label>
              <input className="filter-input" type="range" min={0} max={1} step={0.05} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} />
            </div>
          </div>

          {/* Zweite Zeile: RAG & Session Settings */}
          <div className="filters-row" style={{ marginTop: 8 }}>
            <div className="filter-group">
              <label>Standard-RAG</label>
              <div className="checkbox">
                <input type="checkbox" checked={useRag} onChange={e => setUseRag(e.target.checked)} />
                <span>Dokumente einbeziehen</span>
              </div>
            </div>
            {useRag && (
              <div className="filter-group">
                <label>Top K</label>
                <input className="filter-input" type="number" min={1} max={10} value={ragTopK} onChange={e => setRagTopK(parseInt(e.target.value || '5', 10))} />
              </div>
            )}
            <div className="filter-group">
              <label>Web-RAG 🌐</label>
              <div className="checkbox">
                <input type="checkbox" checked={useWebRag} onChange={e => setUseWebRag(e.target.checked)} />
                <span>Web-Suche einbeziehen</span>
              </div>
            </div>
            <div className="filter-group">
              <label>Session speichern</label>
              <div className="checkbox">
                <input type="checkbox" checked={saveSession} onChange={e => setSaveSession(e.target.checked)} />
                <span>Gespräch automatisch speichern</span>
              </div>
            </div>
            <div className="filter-group">
              <label>Auto-TTS 🔊</label>
              <div className="checkbox">
                <input type="checkbox" checked={autoPlayTTS} onChange={e => setAutoPlayTTS(e.target.checked)} />
                <span>Antworten automatisch vorlesen</span>
              </div>
            </div>
            {autoPlayTTS && (
              <div className="filter-group">
                <label>TTS Stimme</label>
                <select className="filter-select" value={ttsVoice} onChange={e => setTTSVoice(e.target.value as any)}>
                  <option value="alloy">Alloy (Neutral)</option>
                  <option value="echo">Echo (Männlich)</option>
                  <option value="fable">Fable (Britisch)</option>
                  <option value="onyx">Onyx (Tief)</option>
                  <option value="nova">Nova (Weiblich)</option>
                  <option value="shimmer">Shimmer (Weich)</option>
                </select>
              </div>
            )}
          </div>

          {/* Dritte Zeile: Web-RAG Inputs */}
          {useWebRag && (
            <div className="filters-row" style={{ marginTop: 8 }}>
              <div className="filter-group">
                <label>Web-Suchbegriff (optional)</label>
                <input 
                  className="filter-input" 
                  value={webSearchQuery} 
                  onChange={e => setWebSearchQuery(e.target.value)} 
                  placeholder="z.B. 'aktuelle KI Entwicklungen 2024'" 
                />
              </div>
              <div className="filter-group">
                <label>Website-URL (optional)</label>
                <input 
                  className="filter-input" 
                  value={websiteUrl} 
                  onChange={e => setWebsiteUrl(e.target.value)} 
                  placeholder="https://example.com/artikel" 
                />
              </div>
            </div>
          )}

          {/* Vierte Zeile: Session Management */}
          {(saveSession || currentSessionId) && (
            <div className="filters-row" style={{ marginTop: 8 }}>
              <div className="filter-group">
                <label>Session-Titel</label>
                <input 
                  className="filter-input" 
                  value={sessionTitle} 
                  onChange={e => setSessionTitle(e.target.value)} 
                  placeholder={`Chat ${new Date().toLocaleDateString('de-DE')}`}
                />
              </div>
              <div className="filter-group">
                <label>Tags hinzufügen</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {sessionTags.map(tag => (
                    <span key={tag} style={{ 
                      backgroundColor: '#3b82f6', 
                      color: 'white', 
                      padding: '2px 6px', 
                      borderRadius: 12, 
                      fontSize: '12px',
                      cursor: 'pointer'
                    }} onClick={() => removeTag(tag)}>
                      {tag} ×
                    </span>
                  ))}
                  {availableTags.filter(tag => !sessionTags.includes(tag)).slice(0, 5).map(tag => (
                    <span key={tag} style={{ 
                      backgroundColor: '#e5e7eb', 
                      color: '#374151',
                      padding: '2px 6px', 
                      borderRadius: 12, 
                      fontSize: '12px',
                      cursor: 'pointer'
                    }} onClick={() => addTag(tag)}>
                      + {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-box">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <strong>{m.role}:</strong> {m.content}
                </div>
                {/* TTS Button für einzelne Messages */}
                {m.role === 'assistant' && m.content && (
                  <button
                    onClick={() => textToSpeech(m.content)}
                    disabled={!!currentAudio}
                    style={{
                      marginLeft: '8px',
                      background: 'none',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: currentAudio ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: currentAudio ? 0.5 : 1
                    }}
                    title="Diese Nachricht vorlesen"
                  >
                    🔊
                  </button>
                )}
              </div>
              {m.role === 'assistant' && m.sources?.length ? (
                <div style={{ marginTop: 6, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #0ea5e9' }}>
                  <small><strong>📄 Verwendete Quellen:</strong></small>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {m.sources.map((s, idx) => (
                      <li key={`${s.chunk}-${idx}`} style={{ marginBottom: 4 }}>
                        {/* Web-Quelle */}
                        {s.isWeb && s.webUrl ? (
                          <div>
                            <a 
                              href={s.webUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ color: '#0c4a6e', fontWeight: 'bold' }}
                              title={`Öffne: ${s.webUrl}`}
                            >
                              🌐 {s.path} (Web)
                            </a>
                            <div><small style={{ color: '#6b7280' }}>"{s.preview}..."</small></div>
                          </div>
                        ) : 
                        /* Original-Datei */
                        s.isOriginal && s.downloadUrl ? (
                          <div>
                            <button
                              onClick={() => handleDownloadOriginal(s.downloadUrl!, s.path)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#0c4a6e', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                padding: 0,
                                fontSize: 'inherit'
                              }}
                              title={`Download: ${s.path.split('/').pop()}`}
                            >
                              📁 {s.path} (Original-Datei)
                            </button>
                            <div><small style={{ color: '#6b7280' }}>"{s.preview}..."</small></div>
                          </div>
                        ) : (
                          /* Markdown-Dokument */
                          <div>
                            <a 
                              href={`/api/ai/rag/doc-raw?path=${encodeURIComponent(s.path)}`} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ color: '#059669' }}
                            >
                              📝 {s.path} (Markdown)
                            </a>
                            <div><small style={{ color: '#6b7280' }}>"{s.preview}..."</small></div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Nachricht eingeben oder 🎤 für Sprachaufnahme..." 
            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
          />
          
          {/* Voice Input Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            {/* Mikrofonaufnahme */}
            {!isRecording ? (
              <button 
                className="btn btn-secondary" 
                onClick={startRecording}
                title="Sprachaufnahme starten"
                disabled={loading}
                style={{ minWidth: 'auto', padding: '6px 8px' }}
              >
                🎤
              </button>
            ) : (
              <button 
                className="btn" 
                onClick={stopRecording}
                title="Aufnahme beenden"
                style={{ 
                  backgroundColor: '#ef4444', 
                  color: 'white',
                  minWidth: 'auto', 
                  padding: '6px 8px',
                  animation: 'pulse 1s infinite'
                }}
              >
                ⏹️
              </button>
            )}

            {/* Speech-to-Text Verarbeitung */}
            {audioBlob && (
              <button 
                className="btn btn-success" 
                onClick={speechToText}
                disabled={speechToTextLoading}
                title="Audio zu Text konvertieren"
                style={{ minWidth: 'auto', padding: '6px 8px' }}
              >
                {speechToTextLoading ? '⏳' : '📝'}
              </button>
            )}

            {/* Senden Button */}
            <button 
              className="btn btn-primary" 
              onClick={sendMessage} 
              disabled={loading}
              style={{ minWidth: '80px' }}
            >
              {loading ? 'Senden...' : 'Senden'}
            </button>
          </div>
        </div>

        {/* Voice Status Anzeige */}
        {(isRecording || speechToTextLoading || currentAudio) && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '4px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isRecording && (
              <span style={{ color: '#ef4444' }}>
                🔴 Aufnahme läuft... (Klick ⏹️ zum Beenden)
              </span>
            )}
            {speechToTextLoading && (
              <span style={{ color: '#3b82f6' }}>
                ⏳ Konvertiere Audio zu Text...
              </span>
            )}
            {currentAudio && (
              <span style={{ color: '#059669' }}>
                🔊 Audio wird abgespielt... 
                <button 
                  onClick={stopCurrentAudio}
                  style={{ 
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Stoppen
                </button>
              </span>
            )}
          </div>
        )}

        {/* Audio-Recording Preview */}
        {audioBlob && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            backgroundColor: '#fef3c7', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <span style={{ color: '#92400e' }}>
              🎵 Aufnahme bereit ({Math.round(audioBlob.size / 1024)} KB) - Klick 📝 zum Konvertieren
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatPage;