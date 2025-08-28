// Permission Service - Zentrale Verwaltung von User-Berechtigungen
// Lädt Permissions aus department-permissions.json mit Caching

import path from 'path';
import fs from 'fs/promises';
import { isAdministrator, ADMIN_MODULE_PERMISSIONS } from '../config/admin.config';

// Permission Types
export type PermissionLevel = 'admin' | 'access' | 'none';
export type ModuleName = 'ai' | 'support' | 'hr' | 'admin_portal';
export type ModulePermissions = Record<ModuleName, PermissionLevel>;

export interface DepartmentPermission {
  departmentId: string;
  departmentName: string;
  moduleAccess: Partial<Record<ModuleName, PermissionLevel>>;
  userOverrides: Record<string, Partial<Record<ModuleName, PermissionLevel>>>;
  subGroups?: Record<string, any>;
  isMainDepartment?: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

interface CachedPermission {
  permissions: ModulePermissions;
  timestamp: number;
}

export class PermissionService {
  private static cache: Map<string, CachedPermission> = new Map();
  private static cacheTimeout = 5 * 60 * 1000; // 5 Minuten
  private static lastFileCheck = 0;
  private static fileCheckInterval = 30 * 1000; // 30 Sekunden
  
  /**
   * Hauptfunktion: Lädt User-Permissions aus JSON mit Caching
   */
  static async getUserPermissions(userId: string): Promise<ModulePermissions> {
    try {
      console.log(`🔑 PermissionService: Loading permissions for user ${userId}`);
      
      // 0. 👑 ADMINISTRATOR-CHECK: Administratoren bekommen immer alle Rechte!
      if (isAdministrator(userId)) {
        console.log(`👑 PermissionService: Administrator detected (${userId}) - granting full access!`);
        return { ...ADMIN_MODULE_PERMISSIONS };
      }
      
      // 1. Cache prüfen (mit File-Change-Detection)
      await this.checkForFileChanges();
      const cached = this.cache.get(userId);
      
      if (cached && !this.isCacheExpired(cached)) {
        console.log(`📋 PermissionService: Using cached permissions for ${userId}`);
        return cached.permissions;
      }
      
      // 2. Permissions aus JSON laden
      const permissions = await this.loadPermissionsFromJSON(userId);
      
      // 3. Cache aktualisieren
      this.cache.set(userId, {
        permissions,
        timestamp: Date.now()
      });
      
      console.log(`✅ PermissionService: Loaded permissions for ${userId}:`, permissions);
      return permissions;
      
    } catch (error) {
      console.error(`❌ PermissionService: Error loading permissions for ${userId}:`, error);
      
      // Fallback: Keine Permissions (alle Module auf 'none')
      return this.getDefaultPermissions();
    }
  }
  
  /**
   * Lädt Permissions direkt aus der JSON-Datei
   */
  private static async loadPermissionsFromJSON(userId: string): Promise<ModulePermissions> {
    const jsonPath = this.getPermissionsFilePath();
    
    try {
      const fileContent = await fs.readFile(jsonPath, 'utf-8');
      const departmentPermissions: DepartmentPermission[] = JSON.parse(fileContent);
      
      console.log(`📁 PermissionService: Loaded ${departmentPermissions.length} departments from JSON`);
      
      // Kandidatenschlüssel für verschiedene ID-Formate ermitteln
      const candidateIds = this.buildCandidateUserIds(userId);
      
      // Suche User in allen Departments und SubGroups
      for (const department of departmentPermissions) {
        // Prüfe User Overrides im Haupt-Department
        if (department.userOverrides) {
          for (const candidate of candidateIds) {
            const userPermissions = department.userOverrides[candidate as keyof typeof department.userOverrides];
            if (userPermissions) {
              console.log(`🎯 PermissionService: Found user ${candidate} in department ${department.departmentName}`);
              return this.mergeWithDefaults(userPermissions);
            }
          }
        }
        
        // Prüfe User in SubGroups
        if (department.subGroups) {
          for (const subGroup of Object.values(department.subGroups)) {
            if (subGroup.userOverrides) {
              for (const candidate of candidateIds) {
                const userPermissions = subGroup.userOverrides[candidate as keyof typeof subGroup.userOverrides];
                if (userPermissions) {
                  console.log(`🎯 PermissionService: Found user ${candidate} in subgroup ${subGroup.subGroupName}`);
                  return this.mergeWithDefaults(userPermissions);
                }
              }
            }
          }
        }
      }
      
      // User nicht gefunden
      console.log(`⚠️ PermissionService: User ${userId} not found in permissions JSON`);
      return this.getDefaultPermissions();
      
    } catch (error) {
      console.error('❌ PermissionService: Error reading permissions file:', error);
      throw error;
    }
  }
  
  /**
   * Mergiert User-Permissions mit Standard-Permissions
   */
  private static mergeWithDefaults(userPermissions: Partial<Record<string, PermissionLevel>>): ModulePermissions {
    const defaultPermissions = this.getDefaultPermissions();
    const normalized = this.normalizeModuleKeys(userPermissions);
    return {
      ...defaultPermissions,
      ...normalized
    } as ModulePermissions;
  }

  /**
   * Normalisiert Modul-Schlüssel aus JSON (z.B. 'admin-portal' -> 'admin_portal')
   */
  private static normalizeModuleKeys(userPermissions: Partial<Record<string, PermissionLevel>>): Partial<Record<ModuleName, PermissionLevel>> {
    const result: any = {};
    for (const [key, value] of Object.entries(userPermissions || {})) {
      let normalizedKey = key as string;
      if (normalizedKey === 'admin-portal') {
        normalizedKey = 'admin_portal';
      }
      if (['ai', 'support', 'hr', 'admin_portal'].includes(normalizedKey)) {
        result[normalizedKey] = value;
      }
    }
    return result as Partial<Record<ModuleName, PermissionLevel>>;
  }

  /**
   * Baut mögliche User-ID Kandidaten (entra_GUID <-> GUID)
   */
  private static buildCandidateUserIds(userId: string): string[] {
    const candidates = new Set<string>();
    candidates.add(userId);
    const guidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    if (userId.startsWith('entra_')) {
      const raw = userId.substring('entra_'.length);
      candidates.add(raw);
    } else if (guidRegex.test(userId)) {
      candidates.add(`entra_${userId}`);
    }
    return Array.from(candidates);
  }
  
  /**
   * Standard-Permissions (alle Module auf 'none')
   */
  private static getDefaultPermissions(): ModulePermissions {
    return {
      ai: 'none',
      support: 'none',
      hr: 'none',
      admin_portal: 'none'
    };
  }
  
  /**
   * Gibt sichtbare Module basierend auf Permissions zurück
   */
  static getVisibleModules(permissions: ModulePermissions): ModuleName[] {
    return Object.entries(permissions)
      .filter(([module, level]) => level !== 'none')
      .map(([module]) => module as ModuleName);
  }
  
  /**
   * Prüft ob User Zugriff auf bestimmtes Modul hat
   */
  static hasModuleAccess(permissions: ModulePermissions, module: ModuleName): boolean {
    return permissions[module] !== 'none';
  }
  
  /**
   * Prüft ob User Admin-Zugriff auf Modul hat
   */
  static hasAdminAccess(permissions: ModulePermissions, module: ModuleName): boolean {
    return permissions[module] === 'admin';
  }
  
  /**
   * Cache-Management: Prüft ob Cache abgelaufen ist
   */
  private static isCacheExpired(cached: CachedPermission): boolean {
    return Date.now() - cached.timestamp > this.cacheTimeout;
  }
  
  /**
   * Cache-Management: Prüft auf File-Änderungen und leert Cache
   */
  private static async checkForFileChanges(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFileCheck < this.fileCheckInterval) {
      return; // Zu früh für nächsten Check
    }
    
    this.lastFileCheck = now;
    
    try {
      const jsonPath = this.getPermissionsFilePath();
      const stats = await fs.stat(jsonPath);
      const fileTime = stats.mtime.getTime();
      
      // Wenn File neuer als ältester Cache-Eintrag, Cache leeren
      const oldestCache = Math.min(...Array.from(this.cache.values()).map(c => c.timestamp));
      
      if (fileTime > oldestCache) {
        console.log('🧹 PermissionService: File changed, clearing cache');
        this.cache.clear();
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ PermissionService: Could not check file changes:', message);
    }
  }
  
  /**
   * Invalidiert Cache für bestimmten User oder komplett
   */
  static invalidateCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
      console.log(`🧹 PermissionService: Cache invalidated for user ${userId}`);
    } else {
      this.cache.clear();
      console.log('🧹 PermissionService: Complete cache cleared');
    }
  }
  
  /**
   * Gibt Pfad zur Permissions-JSON-Datei zurück
   */
  private static getPermissionsFilePath(): string {
    const adminDataPath = process.env.ADMIN_DATA_PATH || 'admin-data';
    return path.join(process.cwd(), adminDataPath, 'department-permissions.json');
  }
  
  /**
   * Debug: Zeigt Cache-Statistiken
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
