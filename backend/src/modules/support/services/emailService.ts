// Support Module - E-Mail Integration Service

import nodemailer from 'nodemailer';
import { TicketComment } from '../types';

// E-Mail-Konfiguration (aus Environment-Variablen)
const EMAIL_CONFIG = {
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true für 465, false für andere ports
    auth: {
      user: process.env.SMTP_USER || 'support@company.com',
      pass: process.env.SMTP_PASS || 'password'
    }
  },
  from: process.env.SUPPORT_FROM_EMAIL || 'IT-Support <support@company.com>',
  replyTo: process.env.SUPPORT_REPLY_EMAIL || 'tickets@company.com'
};

interface EmailTicketData {
  id: string;
  title: string;
  customerName?: string;
  customerEmail: string;
  status: string;
  priority: string;
  category: string;
}

interface SendTicketMessageOptions {
  ticket: EmailTicketData;
  message: TicketComment;
  isFirstMessage?: boolean;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialisiert den E-Mail-Transporter
   */
  static async initialize(): Promise<void> {
    try {
      console.log('[EmailService] Initialisiere E-Mail-Service...');
      
      this.transporter = nodemailer.createTransport(EMAIL_CONFIG.smtp);
      
      // Verbindung testen
      await this.transporter.verify();
      console.log('✅ [EmailService] E-Mail-Service erfolgreich initialisiert');
      
    } catch (error) {
      console.error('❌ [EmailService] Fehler beim Initialisieren:', error);
      console.warn('[EmailService] E-Mail-Funktionen sind deaktiviert');
      this.transporter = null;
    }
  }

  /**
   * Sendet eine Ticket-Nachricht per E-Mail an den Mitarbeiter
   */
  static async sendTicketMessage(options: SendTicketMessageOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('[EmailService] E-Mail-Service nicht verfügbar - Nachricht nicht gesendet');
      return false;
    }

    try {
      const { ticket, message, isFirstMessage = false } = options;
      
      // E-Mail-Template generieren
      const emailContent = this.generateEmailTemplate(ticket, message, isFirstMessage);
      
      // Reply-To mit Ticket-ID für automatische Zuordnung
      const replyToEmail = `${EMAIL_CONFIG.replyTo.replace('@', `+${ticket.id}@`)}`;
      
      const mailOptions = {
        from: EMAIL_CONFIG.from,
        to: ticket.customerEmail,
        replyTo: replyToEmail,
        subject: `[Ticket #${ticket.id}] ${ticket.title}`,
        html: emailContent.html,
        text: emailContent.text,
        headers: {
          'X-Ticket-ID': ticket.id,
          'X-Ticket-Priority': ticket.priority,
          'X-Ticket-Category': ticket.category
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ [EmailService] E-Mail gesendet an ${ticket.customerEmail} für Ticket ${ticket.id}`);
      console.log(`   Message-ID: ${result.messageId}`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ [EmailService] Fehler beim E-Mail-Versand:`, error);
      return false;
    }
  }

  /**
   * Generiert E-Mail-Template für Ticket-Nachrichten
   */
  private static generateEmailTemplate(
    ticket: EmailTicketData, 
    message: TicketComment, 
    isFirstMessage: boolean
  ): { html: string; text: string } {
    
    const customerName = ticket.customerName || 'Liebe/r Mitarbeiter/in';
    const supportName = message.authorName || 'IT-Support Team';
    const timestamp = new Date(message.createdAt).toLocaleString('de-DE');
    
    // Status und Priorität auf Deutsch
    const statusLabels = {
      'open': 'Offen',
      'in_progress': 'In Bearbeitung', 
      'waiting_customer': 'Wartet auf Rückmeldung',
      'resolved': 'Gelöst',
      'closed': 'Geschlossen'
    };
    
    const priorityLabels = {
      'low': 'Niedrig',
      'medium': 'Normal',
      'high': 'Hoch', 
      'urgent': 'Dringend'
    };

    const categoryLabels = {
      'hardware': 'Hardware',
      'software': 'Software',
      'network': 'Netzwerk',
      'access': 'Zugriff',
      'phone': 'Telefon',
      'other': 'Sonstige'
    };

    // HTML-Version
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .message { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .ticket-info { background: #e0e7ff; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { background: #f1f5f9; padding: 15px; border-radius: 0 0 8px 8px; font-size: 0.9em; color: #64748b; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .status.in_progress { background: #fef3c7; color: #d97706; }
        .status.open { background: #dbeafe; color: #1e40af; }
        .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .priority.high { background: #fef2f2; color: #dc2626; }
        .priority.medium { background: #fefce8; color: #a16207; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🎫 IT-Support Ticket #${ticket.id}</h2>
        <h3>${ticket.title}</h3>
    </div>
    
    <div class="content">
        ${isFirstMessage ? `
        <div class="ticket-info">
            <h4>📋 Ticket-Informationen</h4>
            <p><strong>Status:</strong> <span class="status ${ticket.status}">${statusLabels[ticket.status as keyof typeof statusLabels] || ticket.status}</span></p>
            <p><strong>Priorität:</strong> <span class="priority ${ticket.priority}">${priorityLabels[ticket.priority as keyof typeof priorityLabels] || ticket.priority}</span></p>
            <p><strong>Kategorie:</strong> ${categoryLabels[ticket.category as keyof typeof categoryLabels] || ticket.category}</p>
        </div>
        ` : ''}
        
        <div class="message">
            <h4>💬 Nachricht von ${supportName}</h4>
            <p><strong>Gesendet:</strong> ${timestamp}</p>
            <div style="margin-top: 15px; padding: 10px; background: #f9fafb; border-left: 4px solid #667eea;">
                ${message.content.replace(/\n/g, '<br>')}
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 6px;">
            <h4>📧 So antworten Sie:</h4>
            <p>Antworten Sie einfach auf diese E-Mail. Ihre Antwort wird automatisch dem Ticket hinzugefügt und unser IT-Support-Team benachrichtigt.</p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>IT-Support Team</strong><br>
        Bei Rückfragen können Sie direkt auf diese E-Mail antworten.<br>
        <em>Ticket-ID: #${ticket.id} | Bitte nicht aus der Betreffzeile entfernen</em></p>
    </div>
</body>
</html>
    `.trim();

    // Text-Version (für E-Mail-Clients ohne HTML)
    const text = `
IT-Support Ticket #${ticket.id}
${ticket.title}
${'='.repeat(60)}

Hallo ${customerName},

${isFirstMessage ? `
Ihr Ticket wurde erfolgreich erstellt:
- Status: ${statusLabels[ticket.status as keyof typeof statusLabels] || ticket.status}
- Priorität: ${priorityLabels[ticket.priority as keyof typeof priorityLabels] || ticket.priority}  
- Kategorie: ${categoryLabels[ticket.category as keyof typeof categoryLabels] || ticket.category}

` : ''}

Nachricht von ${supportName} (${timestamp}):
${'-'.repeat(40)}
${message.content}

${'='.repeat(60)}

So antworten Sie:
Antworten Sie einfach auf diese E-Mail. Ihre Antwort wird automatisch 
dem Ticket hinzugefügt und unser IT-Support-Team benachrichtigt.

Mit freundlichen Grüßen,
IT-Support Team

Ticket-ID: #${ticket.id}
Bitte nicht aus der Betreffzeile entfernen.
    `.trim();

    return { html, text };
  }

  /**
   * Prüft ob E-Mail-Service verfügbar ist
   */
  static isAvailable(): boolean {
    return this.transporter !== null;
  }

  /**
   * Extrahiert Ticket-ID aus E-Mail-Subject oder Headers
   */
  static extractTicketId(subject: string, headers?: any): string | null {
    // Suche nach [Ticket #ticket_001] im Subject
    const subjectMatch = subject.match(/\[Ticket #([^\]]+)\]/);
    if (subjectMatch) {
      return subjectMatch[1];
    }
    
    // Suche in Headers
    if (headers && headers['x-ticket-id']) {
      return headers['x-ticket-id'];
    }
    
    // Suche nach +ticket_001@ in Reply-To
    const replyToMatch = subject.match(/\+([^@]+)@/);
    if (replyToMatch) {
      return replyToMatch[1];
    }
    
    return null;
  }
}
