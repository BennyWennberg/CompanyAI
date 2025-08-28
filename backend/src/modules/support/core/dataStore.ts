// Support Module - Centralized Data Store with JSON File Persistence

import { Ticket, TicketComment } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Pfad für die JSON-Daten (ähnlich wie AI-Sessions)
const DATA_DIR = process.env.SUPPORT_DATA_PATH || path.join(process.cwd(), '../${ADMIN_DATA_PATH}/support');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

// Zentrale In-Memory-Daten (werden mit JSON synchronisiert)
let tickets: Ticket[] = [];
let comments: TicketComment[] = [];

/**
 * Initialisiert die Ordnerstruktur und lädt bestehende Daten
 */
export function initializeDataStore(): void {
    try {
        // Ordner erstellen falls nicht vorhanden
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`[DataStore] Ordner erstellt: ${DATA_DIR}`);
        }

        // Tickets laden
        loadTicketsFromFile();
        loadCommentsFromFile();

        // Falls keine Daten vorhanden, Mock-Daten erstellen
        if (tickets.length === 0) {
            createInitialMockData();
        }

        console.log(`[DataStore] Initialisiert: ${tickets.length} Tickets, ${comments.length} Kommentare`);
    } catch (error) {
        console.error('[DataStore] Initialisierung fehlgeschlagen:', error);
        // Fallback auf Mock-Daten
        createInitialMockData();
    }
}

/**
 * Lädt Tickets aus JSON-Datei
 */
function loadTicketsFromFile(): void {
    try {
        if (fs.existsSync(TICKETS_FILE)) {
            const data = fs.readFileSync(TICKETS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            tickets = parsed.map((ticket: any) => ({
                ...ticket,
                createdAt: new Date(ticket.createdAt),
                updatedAt: new Date(ticket.updatedAt),
                resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : undefined
            }));
            console.log(`[DataStore] ${tickets.length} Tickets aus Datei geladen`);
        }
    } catch (error) {
        console.error('[DataStore] Fehler beim Laden der Tickets:', error);
        tickets = [];
    }
}

/**
 * Lädt Kommentare aus JSON-Datei
 */
function loadCommentsFromFile(): void {
    try {
        if (fs.existsSync(COMMENTS_FILE)) {
            const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            comments = parsed.map((comment: any) => ({
                ...comment,
                createdAt: new Date(comment.createdAt),
                updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined
            }));
            console.log(`[DataStore] ${comments.length} Kommentare aus Datei geladen`);
        }
    } catch (error) {
        console.error('[DataStore] Fehler beim Laden der Kommentare:', error);
        comments = [];
    }
}

/**
 * Speichert Tickets in JSON-Datei
 */
function saveTicketsToFile(): void {
    try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
        console.log(`[DataStore] ${tickets.length} Tickets gespeichert`);
    } catch (error) {
        console.error('[DataStore] Fehler beim Speichern der Tickets:', error);
    }
}

/**
 * Speichert Kommentare in JSON-Datei
 */
function saveCommentsToFile(): void {
    try {
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
        console.log(`[DataStore] ${comments.length} Kommentare gespeichert`);
    } catch (error) {
        console.error('[DataStore] Fehler beim Speichern der Kommentare:', error);
    }
}

/**
 * Erstellt initiale Mock-Daten falls keine vorhanden
 */
function createInitialMockData(): void {
    console.log('[DataStore] Erstelle initiale Mock-Daten...');

    tickets = [
        {
            id: 'ticket_001',
            title: 'Laptop startet nicht - Hardware-Problem',
            description: 'Laptop von Max Mustermann startet seit heute Morgen nicht mehr. Beim Drücken der Power-Taste passiert nichts. Gestern hat noch alles funktioniert. Dringend für Präsentation heute Nachmittag benötigt.',
            category: 'hardware',
            priority: 'high',
            status: 'in_progress',
            customerId: 'emp_001',
            customerEmail: 'max.mustermann@company.com',
            customerName: 'Max Mustermann',
            location: 'Büro 2.15, IT-Abteilung',
            deviceInfo: 'ThinkPad X1 Carbon, Service-Tag: ABC123',
            assignedTo: 'Klaus Weber (IT-Support)',
            createdAt: new Date('2023-12-08T09:15:00.000Z'),
            updatedAt: new Date('2023-12-08T14:30:00.000Z')
        },
        {
            id: 'ticket_002',
            title: 'VPN-Zugang funktioniert nicht - Netzwerk-Problem',
            description: 'Seit der Umstellung auf neue VPN-Software kann ich mich nicht mehr von zu Hause einloggen. Fehlermeldung: "Authentifizierung fehlgeschlagen". Dringend für Home-Office benötigt.',
            category: 'network',
            priority: 'medium',
            status: 'resolved',
            customerId: 'emp_002',
            customerEmail: 'anna.schmidt@company.com',
            customerName: 'Anna Schmidt',
            location: 'Home-Office / Marketing',
            assignedTo: 'Maria Müller (IT-Admin)',
            createdAt: new Date('2023-12-07T08:30:00.000Z'),
            updatedAt: new Date('2023-12-07T16:20:00.000Z'),
            resolvedAt: new Date('2023-12-07T16:20:00.000Z')
        },
        {
            id: 'ticket_003',
            title: 'Microsoft Office Installation - Software-Support',
            description: 'Benötige Microsoft Office 365 auf neuem Arbeitsplatz-PC. Zusätzlich Zugang zu SharePoint und Teams erforderlich.',
            category: 'software',
            priority: 'medium',
            status: 'open',
            customerId: 'emp_003',
            customerEmail: 'thomas.jung@company.com',
            customerName: 'Thomas Jung',
            location: 'Büro 1.08, Vertrieb',
            deviceInfo: 'Dell OptiPlex 7090, Windows 11 Pro',
            createdAt: new Date('2023-12-08T11:45:00.000Z'),
            updatedAt: new Date('2023-12-08T11:45:00.000Z')
        }
    ];

    comments = [
        {
            id: 'comment_001',
            ticketId: 'ticket_001',
            authorId: 'sup_001',
            authorName: 'Klaus Weber',
            content: 'Hallo Max, ich habe dein Ticket erhalten. Ich komme um 15:00 zu deinem Arbeitsplatz, um die Hardware zu prüfen.',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-08T14:30:00.000Z')
        },
        {
            id: 'comment_002',
            ticketId: 'ticket_001',
            authorId: 'emp_001',
            authorName: 'Max Mustermann',
            content: 'Danke Klaus! Ich bin um 15:00 an meinem Arbeitsplatz. Das Problem ist wirklich dringend für die Präsentation heute Nachmittag.',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-08T14:45:00.000Z')
        },
        {
            id: 'comment_003',
            ticketId: 'ticket_001',
            authorId: 'sys_auto',
            authorName: 'System',
            content: 'Status geändert von "open" zu "in_progress" durch Klaus Weber',
            type: 'system_message',
            isInternal: true,
            metadata: { oldStatus: 'open', newStatus: 'in_progress' },
            createdAt: new Date('2023-12-08T15:00:00.000Z')
        },
        {
            id: 'comment_004',
            ticketId: 'ticket_001',
            authorId: 'sup_001',
            authorName: 'Klaus Weber',
            content: 'Hardware vor Ort geprüft. Das Problem ist das Netzteil - keine Stromzufuhr. Ich bestelle ein Ersatz-Netzteil, Lieferzeit ca. 1 Tag.',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-08T15:15:00.000Z')
        },
        {
            id: 'comment_005',
            ticketId: 'ticket_001',
            authorId: 'sup_001',
            authorName: 'Klaus Weber',
            content: 'Interne Notiz: Netzteil Modell PA-1650-78 bestellt bei IT-Supplier, Lieferung morgen früh erwartet.',
            type: 'internal_note',
            isInternal: true,
            createdAt: new Date('2023-12-08T15:20:00.000Z')
        },
        {
            id: 'comment_006',
            ticketId: 'ticket_001',
            authorId: 'emp_001',
            authorName: 'Max Mustermann',
            content: 'Verstanden! Kann ich bis morgen einen Laptop ausleihen? Ich habe um 10:00 nochmal ein Meeting.',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-08T15:25:00.000Z')
        },
        {
            id: 'comment_007',
            ticketId: 'ticket_001',
            authorId: 'sup_001',
            authorName: 'Klaus Weber',
            content: 'Klar! Ich bringe dir heute noch einen Leih-Laptop vorbei. Den findest du morgen früh an deinem Arbeitsplatz.',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-08T15:30:00.000Z')
        },
        {
            id: 'comment_008',
            ticketId: 'ticket_002',
            authorId: 'sup_002',
            authorName: 'Maria Müller',
            content: 'Hallo Anna, ich schaue mir dein VPN-Problem an. Kannst du mir kurz sagen, welchen VPN-Client du verwendest?',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-07T10:15:00.000Z')
        },
        {
            id: 'comment_009',
            ticketId: 'ticket_002',
            authorId: 'emp_002',
            authorName: 'Anna Schmidt',
            content: 'Hi Maria! Ich verwende noch den alten Cisco VPN Client, den wir vor einem Jahr installiert hatten.',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-07T10:45:00.000Z')
        },
        {
            id: 'comment_010',
            ticketId: 'ticket_002',
            authorId: 'sup_002',
            authorName: 'Maria Müller',
            content: 'Ah, das erklärt das Problem! Wir haben auf einen neuen VPN-Client umgestellt. Ich installiere ihn remote und konfiguriere alles für dich.',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-07T14:00:00.000Z')
        },
        {
            id: 'comment_011',
            ticketId: 'ticket_002',
            authorId: 'sys_auto',
            authorName: 'System',
            content: 'Status geändert von "open" zu "in_progress" durch Maria Müller',
            type: 'system_message',
            isInternal: true,
            metadata: { oldStatus: 'open', newStatus: 'in_progress' },
            createdAt: new Date('2023-12-07T14:00:00.000Z')
        },
        {
            id: 'comment_012',
            ticketId: 'ticket_002',
            authorId: 'sup_002',
            authorName: 'Maria Müller',
            content: 'Installation abgeschlossen! Kannst du mal testen, ob die VPN-Verbindung jetzt funktioniert?',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-07T16:00:00.000Z')
        },
        {
            id: 'comment_013',
            ticketId: 'ticket_002',
            authorId: 'emp_002',
            authorName: 'Anna Schmidt',
            content: 'Super! Funktioniert perfekt. Vielen Dank für die schnelle Hilfe! 🎉',
            type: 'user_message',
            isInternal: true,
            createdAt: new Date('2023-12-07T16:20:00.000Z')
        },
        {
            id: 'comment_014',
            ticketId: 'ticket_002',
            authorId: 'sys_auto',
            authorName: 'System',
            content: 'Status geändert von "in_progress" zu "resolved" durch Maria Müller',
            type: 'system_message',
            isInternal: true,
            metadata: { oldStatus: 'in_progress', newStatus: 'resolved' },
            createdAt: new Date('2023-12-07T16:25:00.000Z')
        }
    ];

    // Mock-Daten speichern
    saveTicketsToFile();
    saveCommentsToFile();
}

// ===== PUBLIC API =====

/**
 * Gibt alle Tickets zurück
 */
export function getAllTickets(): Ticket[] {
    return [...tickets];
}

/**
 * Sucht ein Ticket nach ID
 */
export function getTicketById(id: string): Ticket | undefined {
    return tickets.find(ticket => ticket.id === id);
}

/**
 * Fügt ein neues Ticket hinzu
 */
export function addTicket(ticket: Ticket): void {
    tickets.push(ticket);
    saveTicketsToFile();
}

/**
 * Aktualisiert ein Ticket
 */
export function updateTicket(id: string, updates: Partial<Ticket>): Ticket | null {
    const index = tickets.findIndex(ticket => ticket.id === id);
    if (index === -1) return null;

    tickets[index] = { ...tickets[index], ...updates, updatedAt: new Date() };
    saveTicketsToFile();
    return tickets[index];
}

/**
 * Gibt alle Kommentare für ein Ticket zurück
 */
export function getCommentsByTicketId(ticketId: string): TicketComment[] {
    return comments
        .filter(comment => comment.ticketId === ticketId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Fügt einen neuen Kommentar hinzu
 */
export function addComment(comment: TicketComment): void {
    comments.push(comment);
    saveCommentsToFile();
}

/**
 * Generiert eine neue Ticket-ID
 */
export function generateTicketId(): string {
    const nextNumber = tickets.length + 1;
    return `ticket_${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Generiert eine neue Kommentar-ID
 */
export function generateCommentId(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `comment_${timestamp}`;
}

// Beim Import initialisieren
initializeDataStore();
