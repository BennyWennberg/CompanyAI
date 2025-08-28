/**
 * 👑 ADMINISTRATOR-KONFIGURATION
 * 
 * Hier werden alle Administrator-E-Mail-Adressen definiert.
 * Benutzer mit diesen E-Mails haben automatisch:
 * - Vollzugriff auf ALLE Module (AI, Support, HR, Admin-Portal)
 * - Admin-Level für alle Funktionen
 * - Bypass aller Permission-Checks
 * 
 * Um einen neuen Administrator hinzuzufügen:
 * 1. E-Mail zur ADMIN_EMAILS Array hinzufügen
 * 2. Backend neustarten
 * 
 * ⚠️ WICHTIG: E-Mails müssen exakt übereinstimmen (Case-Insensitive)
 */

export const ADMIN_EMAILS = [
  // 🔧 System-Administratoren
  'admin@company.com',
  'administrator@company.com', 
  'superuser@company.com',
  'root@company.com',
  'sysadmin@company.com',
  
  // 📝 HIER NEUE ADMIN-E-MAILS HINZUFÜGEN:
  // 'neuer.admin@company.com',
  // 'weitere.admin@company.com',

];

/**
 * Prüft ob eine E-Mail-Adresse Administrator-Rechte hat
 * @param email - Die zu prüfende E-Mail-Adresse
 * @returns true wenn Administrator, false sonst
 */
export function isAdministrator(email?: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Gibt alle Administrator-E-Mails zurück (für Debugging/Logs)
 * @returns Array aller Administrator-E-Mails
 */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

/**
 * Gibt die Anzahl der konfigurierten Administratoren zurück
 * @returns Anzahl der Administratoren
 */
export function getAdminCount(): number {
  return ADMIN_EMAILS.length;
}

/**
 * Standard-Module-Berechtigungen für Administratoren
 * Administratoren haben immer "admin" Level für alle Module
 */
export const ADMIN_MODULE_PERMISSIONS = {
  ai: 'admin' as const,
  support: 'admin' as const,
  hr: 'admin' as const,
  admin_portal: 'admin' as const,
  admin: 'admin' as const,
};

/**
 * Alle verfügbaren Module für Administratoren
 */
export const ADMIN_VISIBLE_MODULES = ['ai', 'support', 'hr', 'admin_portal'] as const;
