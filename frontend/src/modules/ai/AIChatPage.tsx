import React, { useState } from 'react';
import './styles/AIPages.css';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const AIChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const token = localStorage.getItem('authToken');
    if (!token) { setError('Nicht authentifiziert'); return; }
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true); setError(null);
    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler');
      const content = data.data?.choices?.[0]?.message?.content || '[keine Antwort]';
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Senden');
    } finally { setLoading(false); }
  };

  return (
    <div className="ai-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🤖 AI Chat</h1>
          <p>Einfacher Chat mit dem OpenWebUI-Backend</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setMessages([])}>Leeren</button>
        </div>
      </div>

      <div className="content-section">
        {error && <div className="error-state"><p>{error}</p></div>}
        <div className="chat-box">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              <strong>{m.role}:</strong> {m.content}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nachricht eingeben..." />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading}>{loading ? 'Senden...' : 'Senden'}</button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;


