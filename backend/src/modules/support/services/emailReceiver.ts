// Support Module - E-Mail-Empfang für Ticket-Antworten

import * as Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { EmailService } from './emailService';
import { addTicketComment } from '../functions/manageComments';
import { getTicketById } from '../core/dataStore';

// E-Mail-Empfang-Konfiguration
const IMAP_CONFIG = {
  host: process.env.IMAP_HOST || 'localhost',
  port: parseInt(process.env.IMAP_PORT || '993'),
  tls: process.env.IMAP_TLS !== 'false', // Default true für IMAP
  auth: {
    user: process.env.IMAP_USER || process.env.SMTP_USER || 'support@company.com',
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS || 'password'
  }
};

export class EmailReceiver {
  private static imap: Imap | null = null;
  private static isProcessing: boolean = false;

  /**
   * Startet den E-Mail-Empfang (IMAP-Monitoring)
   */
  static async startEmailMonitoring(): Promise<void> {
    if (!process.env.ENABLE_EMAIL_RECEIVE || process.env.ENABLE_EMAIL_RECEIVE !== 'true') {
      console.log('[EmailReceiver] E-Mail-Empfang ist deaktiviert (ENABLE_EMAIL_RECEIVE != true)');
      return;
    }

    try {
      console.log('[EmailReceiver] Starte E-Mail-Monitoring...');
      
      this.imap = new Imap(IMAP_CONFIG);
      
      this.imap.once('ready', () => {
        console.log('✅ [EmailReceiver] IMAP-Verbindung hergestellt');
        this.openInbox();
      });

      this.imap.once('error', (err: Error) => {
        console.error('❌ [EmailReceiver] IMAP-Fehler:', err);
        this.imap = null;
      });

      this.imap.once('end', () => {
        console.log('[EmailReceiver] IMAP-Verbindung beendet');
        this.imap = null;
      });

      this.imap.connect();

    } catch (error) {
      console.error('[EmailReceiver] Fehler beim Starten des E-Mail-Empfangs:', error);
    }
  }

  /**
   * Öffnet den INBOX-Ordner und überwacht neue E-Mails
   */
  private static openInbox(): void {
    if (!this.imap) return;

    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('[EmailReceiver] Fehler beim Öffnen der INBOX:', err);
        return;
      }

      console.log(`📬 [EmailReceiver] INBOX geöffnet: ${box.messages.total} E-Mails`);

      // Überwache neue E-Mails
      this.imap!.on('mail', () => {
        console.log('📧 [EmailReceiver] Neue E-Mail erhalten');
        this.processNewEmails();
      });

      // Verarbeite vorhandene ungelesene E-Mails
      this.processNewEmails();
    });
  }

  /**
   * Verarbeitet neue/ungelesene E-Mails
   */
  private static async processNewEmails(): Promise<void> {
    if (!this.imap || this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Suche nach ungelesenen E-Mails
      this.imap.search(['UNSEEN'], (err, results) => {
        if (err) {
          console.error('[EmailReceiver] Fehler bei E-Mail-Suche:', err);
          this.isProcessing = false;
          return;
        }

        if (!results || results.length === 0) {
          console.log('[EmailReceiver] Keine neuen E-Mails gefunden');
          this.isProcessing = false;
          return;
        }

        console.log(`[EmailReceiver] ${results.length} ungelesene E-Mails gefunden`);

        const fetch = this.imap!.fetch(results, {
          bodies: '',
          markSeen: true
        });

        fetch.on('message', (msg, seqno) => {
          console.log(`[EmailReceiver] Verarbeite E-Mail #${seqno}`);
          
          msg.on('body', (stream) => {
            simpleParser(stream, async (err, parsed) => {
              if (err) {
                console.error(`[EmailReceiver] Fehler beim Parsen der E-Mail #${seqno}:`, err);
                return;
              }

              await this.processEmailForTicket(parsed);
            });
          });
        });

        fetch.once('end', () => {
          this.isProcessing = false;
          console.log('[EmailReceiver] E-Mail-Verarbeitung abgeschlossen');
        });
      });

    } catch (error) {
      console.error('[EmailReceiver] Fehler beim Verarbeiten neuer E-Mails:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Verarbeitet eine geparste E-Mail und fügt sie zum entsprechenden Ticket hinzu
   */
  private static async processEmailForTicket(email: ParsedMail): Promise<void> {
    try {
      const subject = email.subject || '';
      const from = email.from?.text || '';
      const textContent = email.text || '';
      const htmlContent = email.html || '';

      console.log(`[EmailReceiver] Verarbeite E-Mail von: ${from}, Betreff: ${subject}`);

      // Extrahiere Ticket-ID aus Subject oder Headers
      const ticketId = EmailService.extractTicketId(subject, email.headers);

      if (!ticketId) {
        console.log(`[EmailReceiver] Keine Ticket-ID in E-Mail gefunden: ${subject}`);
        return;
      }

      // Prüfe ob Ticket existiert
      const ticket = getTicketById(ticketId);
      if (!ticket) {
        console.log(`[EmailReceiver] Ticket ${ticketId} nicht gefunden - ignoriere E-Mail`);
        return;
      }

      // Extrahiere reinen E-Mail-Inhalt (ohne Signaturen, Quotes, etc.)
      const cleanContent = this.cleanEmailContent(textContent);

      if (!cleanContent.trim()) {
        console.log(`[EmailReceiver] E-Mail hat keinen verwertbaren Inhalt - übersprungen`);
        return;
      }

      // Bestimme Autor aus E-Mail-Adresse
      const authorEmail = this.extractEmailAddress(from);
      const isFromCustomer = authorEmail === ticket.customerEmail;
      
      const authorName = isFromCustomer 
        ? ticket.customerName || 'Mitarbeiter'
        : 'Externe Antwort';

      // Füge Kommentar zum Ticket hinzu
      const result = await addTicketComment(
        ticketId,
        {
          content: cleanContent,
          type: 'user_message' // E-Mail-Antworten sind immer User-Messages
        },
        isFromCustomer ? ticket.customerId : 'email_reply',
        authorName
      );

      if (result.success) {
        console.log(`✅ [EmailReceiver] E-Mail-Antwort zu Ticket ${ticketId} hinzugefügt`);
      } else {
        console.error(`❌ [EmailReceiver] Fehler beim Hinzufügen der E-Mail-Antwort: ${result.message}`);
      }

    } catch (error) {
      console.error('[EmailReceiver] Fehler bei E-Mail-Verarbeitung:', error);
    }
  }

  /**
   * Bereinigt E-Mail-Inhalt (entfernt Signaturen, Quotes, etc.)
   */
  private static cleanEmailContent(content: string): string {
    if (!content) return '';

    let lines = content.split('\n');
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Stoppe bei typischen E-Mail-Quote-Markern
      if (
        trimmedLine.startsWith('>') ||
        trimmedLine.startsWith('Am ') && trimmedLine.includes('schrieb:') ||
        trimmedLine.startsWith('On ') && trimmedLine.includes('wrote:') ||
        trimmedLine.includes('-----Original Message-----') ||
        trimmedLine.includes('Von:') && trimmedLine.includes('Gesendet:') ||
        trimmedLine.includes('From:') && trimmedLine.includes('Sent:')
      ) {
        break;
      }

      // Ignoriere leere Zeilen und Signatures
      if (
        trimmedLine === '' ||
        trimmedLine === '--' ||
        trimmedLine.startsWith('Mit freundlichen Grüßen') ||
        trimmedLine.startsWith('Best regards')
      ) {
        continue;
      }

      cleanLines.push(line);
    }

    return cleanLines.join('\n').trim();
  }

  /**
   * Extrahiert E-Mail-Adresse aus From-Header
   */
  private static extractEmailAddress(fromHeader: string): string {
    const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1] : fromHeader;
  }

  /**
   * Stoppt das E-Mail-Monitoring
   */
  static stopEmailMonitoring(): void {
    if (this.imap) {
      console.log('[EmailReceiver] Stoppe E-Mail-Monitoring...');
      this.imap.end();
      this.imap = null;
    }
  }

  /**
   * Prüft ob E-Mail-Empfang verfügbar ist
   */
  static isAvailable(): boolean {
    return process.env.ENABLE_EMAIL_RECEIVE === 'true' && this.imap !== null;
  }
}
