import React, { useState, useEffect, useRef } from 'react';
import '../styles/SupportPages.css';

// Interfaces - entsprechen Backend Types
interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: 'user_message' | 'internal_note' | 'status_change' | 'assignment' | 'system_message';
  isInternal: boolean;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    oldAssignedTo?: string;
    newAssignedTo?: string;
    messageFormat?: 'text' | 'markdown';
  };
  createdAt: string;
  updatedAt?: string;
}

interface TicketChatProps {
  ticketId: string;
  messages: TicketComment[];
  currentUserId?: string;
  onSendMessage: (content: string, type: 'user_message' | 'internal_note') => Promise<void>;
  loading?: boolean;
}

const TicketChat: React.FC<TicketChatProps> = ({
  ticketId,
  messages,
  currentUserId = 'unknown',
  onSendMessage,
  loading = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'user_message' | 'internal_note'>('user_message');
  const [sending, setSending] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll zu neuen Nachrichten
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Message senden
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await onSendMessage(newMessage.trim(), messageType);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setSending(false);
    }
  };

  // Enter-Key für Senden
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Message-Type bestimmen für Styling
  const getMessageClass = (message: TicketComment) => {
    const baseClass = 'chat-message';
    const typeClass = `chat-${message.type}`;
    const authorClass = message.authorId === currentUserId ? 'chat-own' : 'chat-other';
    
    return `${baseClass} ${typeClass} ${authorClass}`;
  };

  // Author Icon
  const getAuthorIcon = (message: TicketComment) => {
    if (message.type === 'system_message') return '🤖';
    if (message.authorId.startsWith('sup_')) return '🔧'; // IT-Support
    if (message.authorId.startsWith('emp_')) return '👤'; // Mitarbeiter
    return '💬';
  };

  // Message-Type Icon
  const getTypeIcon = (type: TicketComment['type']) => {
    switch (type) {
      case 'user_message': return '💬';
      case 'internal_note': return '📝';
      case 'system_message': return '⚙️';
      case 'status_change': return '🔄';
      case 'assignment': return '👥';
      default: return '💬';
    }
  };

  // Zeit formatieren
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Datum formatieren
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    }
    
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  // Gruppierte Nachrichten nach Datum
  const groupMessagesByDate = (messages: TicketComment[]) => {
    const groups: { [key: string]: TicketComment[] } = {};
    
    messages.forEach(message => {
      const dateKey = new Date(message.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).sort(([a], [b]) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  };

  if (loading) {
    return (
      <div className="ticket-chat-loading">
        <div className="spinner"></div>
        <p>Chat wird geladen...</p>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="ticket-chat">
      <div className="chat-header">
        <div className="chat-title">
          <h3>💬 Ticket-Chat</h3>
          <span className="message-count">{messages.length} Nachrichten</span>
        </div>
      </div>

      <div className="chat-messages" ref={chatContainerRef}>
        {messageGroups.length === 0 ? (
          <div className="chat-empty">
            <p>Noch keine Nachrichten. Starten Sie die Konversation!</p>
          </div>
        ) : (
          messageGroups.map(([dateKey, groupMessages]) => (
            <div key={dateKey} className="message-group">
              <div className="date-separator">
                <span>{formatDate(dateKey)}</span>
              </div>
              
              {groupMessages.map((message) => (
                <div key={message.id} className={getMessageClass(message)}>
                  <div className="message-avatar">
                    {getAuthorIcon(message)}
                  </div>
                  
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author">
                        {message.authorName}
                      </span>
                      <span className="message-type-icon">
                        {getTypeIcon(message.type)}
                      </span>
                      <span className="message-time">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    
                    <div className="message-text">
                      {message.content}
                    </div>
                    
                    {/* E-Mail-Status für user_message */}
                    {message.type === 'user_message' && (
                      <div className="message-metadata">
                        <span className="email-sent-indicator">
                          📧 Per E-Mail versendet
                        </span>
                      </div>
                    )}
                    
                    {message.type === 'system_message' && message.metadata && (
                      <div className="message-metadata">
                        {message.metadata.oldStatus && message.metadata.newStatus && (
                          <span className="status-change">
                            {message.metadata.oldStatus} → {message.metadata.newStatus}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="chat-input-section">
        <div className="message-type-selector">
          <label>
            <input
              type="radio"
              name="messageType"
              value="user_message"
              checked={messageType === 'user_message'}
              onChange={(e) => setMessageType(e.target.value as 'user_message')}
            />
            💬 Nachricht
          </label>
          <label>
            <input
              type="radio"
              name="messageType"
              value="internal_note"
              checked={messageType === 'internal_note'}
              onChange={(e) => setMessageType(e.target.value as 'internal_note')}
            />
            📝 Interne Notiz
          </label>
        </div>

        <div className="chat-input-container">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={
              messageType === 'user_message' 
                ? "Nachricht schreiben... (Enter zum Senden)" 
                : "Interne Notiz schreiben..."
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={3}
          />
          
          <button
            className={`chat-send-btn ${messageType === 'internal_note' ? 'internal' : ''}`}
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <div className="btn-spinner"></div>
            ) : messageType === 'internal_note' ? (
              '📝 Notiz'
            ) : (
              '📤 Senden'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketChat;
