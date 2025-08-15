import React, { useState } from 'react';
import '../styles/AIPages.css';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: { path: string; chunk: string; preview: string }[];
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
        body: JSON.stringify({ messages: newMessages, provider, model, temperature, rag: useRag, ragTopK }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler');
      const content: string = data.data?.choices?.[0]?.message?.content || '[keine Antwort]';
      const sources = data?.meta?.rag?.sources as ChatMessage['sources'] | undefined;
      setMessages(prev => [...prev, { role: 'assistant', content, sources }]);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Senden');
    } finally { setLoading(false); }
  };

  return (
    <div className="ai-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🤖 AI Chat</h1>
          <p>Direkter Multi-Provider Chat (OpenAI, Gemini, Ollama) mit optionalem RAG</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setMessages([])}>Leeren</button>
        </div>
      </div>

      <div className="content-section">
        {error && <div className="error-state"><p>{error}</p></div>}

        <div className="filters-section" style={{ marginBottom: 16 }}>
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
            <div className="filter-group">
              <label>RAG</label>
              <div className="checkbox">
                <input type="checkbox" checked={useRag} onChange={e => setUseRag(e.target.checked)} />
                <span>Kontext aus docs/ einbeziehen</span>
              </div>
            </div>
            {useRag && (
              <div className="filter-group">
                <label>Top K</label>
                <input className="filter-input" type="number" min={1} max={10} value={ragTopK} onChange={e => setRagTopK(parseInt(e.target.value || '5', 10))} />
              </div>
            )}
          </div>
        </div>

        <div className="chat-box">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              <strong>{m.role}:</strong> {m.content}
              {m.role === 'assistant' && m.sources?.length ? (
                <div style={{ marginTop: 6 }}>
                  <small><strong>Quellen:</strong></small>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {m.sources.map((s, idx) => (
                      <li key={`${s.chunk}-${idx}`}>
                        <a href={`/api/ai/rag/doc-raw?path=${encodeURIComponent(s.path)}`} target="_blank" rel="noreferrer">{s.path}</a>
                        <small> – {s.preview}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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


