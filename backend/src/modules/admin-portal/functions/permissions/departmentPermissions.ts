// Department Permissions Management
// Verwaltet die Abteilungs-spezifischen Modulrechte für echte User

import path from 'path';
import fs from 'fs/promises';
import { APIResponse } from '../../types';

export type ModuleAccessLevel = 'none' | 'access' | 'admin';
export type CascadeMode = 'department' | 'subgroup' | 'user';

export interface DepartmentPermissions {
  departmentId: string;
  departmentName: string;
  moduleAccess: {
    [moduleKey: string]: ModuleAccessLevel;
  };
  subGroups?: {
    [subGroupId: string]: SubGroupPermissions;
  };
  userOverrides: {
    [userId: string]: {
      [moduleKey: string]: ModuleAccessLevel;
    };
  };
  isMainDepartment?: boolean; // Unterscheidung zwischen Ober- und Unterabteilung
  parentDepartment?: string;  // Verweis auf Oberabteilung (nur bei Untergruppen)
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SubGroupPermissions {
  subGroupId: string;
  subGroupName: string;
  parentDepartment: string;
  moduleAccess: {
    [moduleKey: string]: ModuleAccessLevel;
  };
  userOverrides: {
    [userId: string]: {
      [moduleKey: string]: ModuleAccessLevel;
    };
  };
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PermissionCheckResult {
  hasAccess: boolean;
  accessLevel: ModuleAccessLevel;
  source: 'department' | 'user_override' | 'default' | 'admin_override';
  reason: string;
}

const PERMISSIONS_FILE = path.join(process.env.ADMIN_DATA_PATH || 'admin-data', 'department-permissions.json');

/**
 * Lädt alle Department-Permissions (synchron für interne Nutzung)
 */
export function loadAllPermissions(): DepartmentPermissions[] {
  try {
    // Synchrones Lesen der Datei
    const fs = require('fs');
    
    // Stelle sicher, dass das Verzeichnis existiert
    if (!fs.existsSync(path.dirname(PERMISSIONS_FILE))) {
      fs.mkdirSync(path.dirname(PERMISSIONS_FILE), { recursive: true });
    }

    if (!fs.existsSync(PERMISSIONS_FILE)) {
      console.log(`📋 Permissions-Datei nicht gefunden - erstelle leere Liste: ${PERMISSIONS_FILE}`);
      return [];
    }

    const data = fs.readFileSync(PERMISSIONS_FILE, 'utf8');
    const permissions = JSON.parse(data);
    
    console.log(`📋 Department-Permissions synchron geladen: ${permissions.length} Abteilungen`);
    return permissions;
    
  } catch (error) {
    console.error('❌ Fehler beim synchronen Laden der Department-Permissions:', error);
    return []; // Fallback: leere Liste
  }
}

/**
 * Speichert alle Department-Permissions (synchron für interne Nutzung)
 */
function saveAllPermissions(permissions: DepartmentPermissions[]): void {
  try {
    const fs = require('fs');
    
    // Stelle sicher, dass das Verzeichnis existiert
    if (!fs.existsSync(path.dirname(PERMISSIONS_FILE))) {
      fs.mkdirSync(path.dirname(PERMISSIONS_FILE), { recursive: true });
    }

    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(permissions, null, 2), 'utf8');
    console.log(`💾 Department-Permissions synchron gespeichert: ${permissions.length} Abteilungen`);
    
  } catch (error) {
    console.error('❌ Fehler beim synchronen Speichern der Department-Permissions:', error);
  }
}

/**
 * Lädt alle Department-Permissions (asynchron für API)
 */
export async function loadDepartmentPermissions(): Promise<APIResponse<DepartmentPermissions[]>> {
  try {
    // Stelle sicher, dass das Verzeichnis existiert
    await fs.mkdir(path.dirname(PERMISSIONS_FILE), { recursive: true });

    let permissions: DepartmentPermissions[] = [];

    try {
      const data = await fs.readFile(PERMISSIONS_FILE, 'utf8');
      permissions = JSON.parse(data);
      
      console.log(`📋 Department-Permissions geladen: ${permissions.length} Abteilungen`);
    } catch (readError) {
      // Datei existiert noch nicht - erstelle leere Liste
      console.log('📋 Keine Department-Permissions gefunden, erstelle neue Datei');
      await fs.writeFile(PERMISSIONS_FILE, JSON.stringify([], null, 2));
      permissions = [];
    }

    // 🚫 Automatische Population deaktiviert: Änderungen nur über Admin-Portal
    return {
      success: true,
      data: permissions,
      message: `${permissions.length} Abteilungen geladen`
    };
  } catch (error) {
    console.error('❌ Fehler beim Laden der Department-Permissions:', error);
    return {
      success: false,
      error: 'LoadError',
      message: 'Fehler beim Laden der Department-Permissions'
    };
  }
}

/**
 * Speichert/Aktualisiert Department-Permissions
 */
/**
 * 🆕 Speichert SubGroup-Permissions unter einer Hauptabteilung
 */
export async function saveSubGroupPermissions(
  parentDepartmentId: string,
  parentDepartmentName: string,
  subGroupId: string,
  subGroupName: string,
  subGroupModuleAccess: { [moduleKey: string]: ModuleAccessLevel },
  userOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } },
  updatedBy: string
): Promise<APIResponse<DepartmentPermissions>> {
  try {
    console.log(`📂 Speichere SubGroup-Permissions: ${subGroupId} in ${parentDepartmentId}`);
    
    // Lade bestehende Permissions
    const existingResult = await loadDepartmentPermissions();
    let allPermissions = existingResult.success ? (existingResult.data || []) : [];

    // Finde die Hauptabteilung
    let parentDepartmentIndex = allPermissions.findIndex(p => p.departmentId === parentDepartmentId);
    
    if (parentDepartmentIndex === -1) {
      // Hauptabteilung existiert noch nicht - erstelle sie
      console.log(`✨ Erstelle neue Hauptabteilung: ${parentDepartmentId}`);
      const newParentDepartment: DepartmentPermissions = {
        departmentId: parentDepartmentId,
        departmentName: parentDepartmentName,
        moduleAccess: {},
        subGroups: {},
        userOverrides: {},
        isMainDepartment: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy
      };
      allPermissions.push(newParentDepartment);
      parentDepartmentIndex = allPermissions.length - 1;
    }

    // Stelle sicher, dass subGroups existiert
    if (!allPermissions[parentDepartmentIndex].subGroups) {
      allPermissions[parentDepartmentIndex].subGroups = {};
    }

    // Erstelle/Aktualisiere SubGroup-Permissions
    const subGroupPermission: SubGroupPermissions = {
      subGroupId,
      subGroupName,
      parentDepartment: parentDepartmentName,
      moduleAccess: subGroupModuleAccess,
      userOverrides,
      createdAt: allPermissions[parentDepartmentIndex].subGroups![subGroupId]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    // Speichere die SubGroup unter der Hauptabteilung
    allPermissions[parentDepartmentIndex].subGroups![subGroupId] = subGroupPermission;
    allPermissions[parentDepartmentIndex].updatedAt = new Date().toISOString();
    allPermissions[parentDepartmentIndex].updatedBy = updatedBy;

    console.log(`📂 SubGroup-Permissions gespeichert: ${subGroupId} → ${Object.keys(subGroupModuleAccess).length} Module`);

    // Speichere die gesamte Permissions-Datei
    await fs.writeFile(PERMISSIONS_FILE, JSON.stringify(allPermissions, null, 2));
    
    return {
      success: true,
      data: allPermissions[parentDepartmentIndex],
      message: `SubGroup-Permissions für "${subGroupName}" erfolgreich gespeichert`
    };
    
  } catch (error) {
    console.error('❌ Fehler beim Speichern der SubGroup-Permissions:', error);
    return {
      success: false,
      error: 'SubGroupPermissionsSaveError',
      message: 'Fehler beim Speichern der SubGroup-Permissions'
    };
  }
}

// ❌ ENTFERNT: Alte saveDepartmentPermissions Funktion
// Diese Funktion wurde durch saveDepartmentPermissionsWithCascade ersetzt, 
// da sie keine hierarchischen subGroups unterstützte!

/**
 * 🆕 Aktualisiert NUR User-Overrides ohne Department/SubGroup zu berühren
 */
export async function updateUserOverridesOnly(
  departmentId: string,
  departmentName: string,
  userOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } },
  updatedBy: string,
  subGroupId?: string
): Promise<APIResponse<DepartmentPermissions>> {
  try {
    console.log(`👤 Aktualisiere NUR User-Overrides für: ${departmentId}`);
    
    // Lade bestehende Permissions
    const existingResult = await loadDepartmentPermissions();
    let allPermissions = existingResult.success ? (existingResult.data || []) : [];

    // Finde die Hauptabteilung
    let departmentIndex = allPermissions.findIndex(p => p.departmentId === departmentId);
    
    if (departmentIndex === -1) {
      // Department existiert noch nicht - erstelle es
      console.log(`✨ Erstelle neue Hauptabteilung für User-Overrides: ${departmentId}`);
      const newDepartment: DepartmentPermissions = {
      departmentId,
      departmentName,
        moduleAccess: {}, // Leer - wird nicht verändert
        subGroups: {},
      userOverrides,
        isMainDepartment: true,
        createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy
    };
      allPermissions.push(newDepartment);
      departmentIndex = allPermissions.length - 1;
    } else {
      // Department existiert - Speichere User-Overrides NUR an der richtigen Stelle
      const existingDept = allPermissions[departmentIndex];
      
      // ✅ KORRIGIERT: Speichere User-Overrides nur in SubGroup ODER Department, niemals in beiden!
      if (subGroupId) {
        // 📂 SUBGROUP-USER: Speichere nur in SubGroup
        if (existingDept.subGroups && existingDept.subGroups[subGroupId]) {
          const existingSubGroupOverrides = existingDept.subGroups[subGroupId].userOverrides || {};
          const mergedSubGroupOverrides = { ...existingSubGroupOverrides };
          
          Object.keys(userOverrides).forEach(userId => {
            if (!mergedSubGroupOverrides[userId]) {
              mergedSubGroupOverrides[userId] = {};
            }
            Object.keys(userOverrides[userId]).forEach(moduleKey => {
              mergedSubGroupOverrides[userId][moduleKey] = userOverrides[userId][moduleKey];
            });
          });

          existingDept.subGroups[subGroupId].userOverrides = mergedSubGroupOverrides;
          existingDept.subGroups[subGroupId].updatedAt = new Date().toISOString();
          existingDept.subGroups[subGroupId].updatedBy = updatedBy;
          
          console.log(`👤 User-Overrides NUR in SubGroup ${subGroupId} aktualisiert`);
        }
    } else {
        // 🏢 DEPARTMENT-USER: Speichere nur in Department
        const mergedUserOverrides = { ...existingDept.userOverrides };
        Object.keys(userOverrides).forEach(userId => {
          if (!mergedUserOverrides[userId]) {
            mergedUserOverrides[userId] = {};
          }
          Object.keys(userOverrides[userId]).forEach(moduleKey => {
            mergedUserOverrides[userId][moduleKey] = userOverrides[userId][moduleKey];
          });
        });

        allPermissions[departmentIndex].userOverrides = mergedUserOverrides;
        console.log(`👤 User-Overrides NUR in Department ${departmentId} aktualisiert`);
      }
      
      // Aktualisiere Department-Metadaten
      allPermissions[departmentIndex].updatedAt = new Date().toISOString();
      allPermissions[departmentIndex].updatedBy = updatedBy;
      
      console.log(`✅ User-Overrides-Only Update korrekt - keine Duplikate mehr!`);
    }

    // Speichere die gesamte Permissions-Datei
    await fs.writeFile(PERMISSIONS_FILE, JSON.stringify(allPermissions, null, 2));

    return {
      success: true,
      data: allPermissions[departmentIndex],
      message: 'User-Overrides erfolgreich aktualisiert'
    };

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der User-Overrides:', error);
    return {
      success: false,
      error: 'UserOverrideUpdateError',
      message: 'Fehler beim Aktualisieren der User-Overrides'
    };
  }
}

/**
 * Prüft ob ein User Admin ist (über localStorage userRole oder JWT)
 */
export function isUserAdmin(userEmail: string, userRole?: string): boolean {
  console.log(`🔍 Admin-Check für: Email="${userEmail}", Role="${userRole}"`);
  
  // Import Admin-Emails aus zentraler Konfiguration  
  const { getAdminEmails } = require('../../../../config/admin.config');
  const adminEmails = getAdminEmails();
  
  // Debug: Zeige alle Admin-Emails
  console.log(`📋 Verfügbare Admin-Emails:`, adminEmails);
  console.log(`🔍 Suche nach: "${userEmail.toLowerCase()}" in Admin-Liste`);
  
  // Check 1: Admin-Email
  if (adminEmails.includes(userEmail.toLowerCase())) {
    console.log(`👑 ${userEmail} ist Admin (Email-basiert)`);
    return true;
  }
  
  // Check 2: User-Role ist admin
  if (userRole === 'admin' || userRole === 'administrator') {
    console.log(`👑 ${userEmail} ist Admin (Role-basiert: ${userRole})`);
    return true;
  }
  
  console.log(`❌ ${userEmail} ist KEIN Admin`);
  return false;
}

/**
 * Prüft ob ein User Zugriff auf ein Modul hat (für echte User aus der User-Übersicht)
 */
export async function checkUserModuleAccess(
  userEmail: string,
  userDepartment: string,
  moduleKey: string,
  userRole?: string
): Promise<APIResponse<PermissionCheckResult>> {
  try {
    console.log(`🔍 Prüfe Zugriff für ${userEmail} auf Modul ${moduleKey} (Abteilung: ${userDepartment})`);
    
    // 👑 ADMINISTRATOR-BYPASS: Echte Admins haben immer vollen Zugriff auf alles
    const isAdmin = isUserAdmin(userEmail, userRole);
    if (isAdmin) {
      console.log(`👑 ADMINISTRATOR-Bypass: ${userEmail} bekommt admin-Zugriff auf ${moduleKey} (umgeht alle Restrictions)`);
      return {
        success: true,
        data: {
          hasAccess: true,
          accessLevel: 'admin',
          source: 'admin_override',
          reason: 'Administrator hat immer vollen Zugriff auf alle Module'
        },
        message: `Admin-Vollzugriff auf ${moduleKey}`
      };
    }
    
    console.log(`🔍 ${userEmail} (NORMALER USER) - nutzt Admin-Portal Department-Permissions für ${moduleKey}`);
    
    const permissionsResult = await loadDepartmentPermissions();
    if (!permissionsResult.success) {
      return {
        success: false,
        error: permissionsResult.error,
        message: permissionsResult.message
      };
    }

    const permissions = permissionsResult.data || [];

    // Finde Department-Permissions
    const departmentPermission = permissions.find(p => 
      p.departmentId === userDepartment || 
      p.departmentName.toLowerCase() === userDepartment.toLowerCase()
    );
    
    if (!departmentPermission) {
      console.log(`⚠️ Keine Permissions für Department '${userDepartment}' gefunden - Standard-Fallback wird angewendet`);
      
      // ✅ KEIN Default-Fallback mehr - nur Admin-Portal Permissions werden respektiert
      console.log(`❌ Keine Department-Permissions für '${userDepartment}' konfiguriert - Zugriff verweigert für ${moduleKey}`);
      
      return {
        success: true,
        data: {
          hasAccess: false,
          accessLevel: 'none',
          source: 'default',
          reason: `Department '${userDepartment}' nicht im Admin-Portal konfiguriert - kein Zugriff`
        },
        message: 'Kein Zugriff - Department-Permissions erforderlich'
      };
    }

    // Prüfe User-Override zuerst (höchste Priorität)
    const userOverride = departmentPermission.userOverrides[userEmail]?.[moduleKey];
    if (userOverride && userOverride !== 'none') {
      console.log(`✅ User-Override gefunden: ${userEmail} hat ${userOverride}-Zugriff auf ${moduleKey}`);
      return {
        success: true,
        data: {
          hasAccess: true,
          accessLevel: userOverride,
          source: 'user_override',
          reason: `Individuelle Berechtigung: ${userOverride}`
        },
        message: `Zugriff via User-Override: ${userOverride}`
      };
    }

    // Prüfe Department-Level Zugriff
    const departmentAccess = departmentPermission.moduleAccess[moduleKey];
    if (departmentAccess && departmentAccess !== 'none') {
      console.log(`✅ Department-Zugriff gefunden: ${userDepartment} hat ${departmentAccess}-Zugriff auf ${moduleKey}`);
      return {
        success: true,
        data: {
          hasAccess: true,
          accessLevel: departmentAccess,
          source: 'department',
          reason: `Abteilungs-Berechtigung: ${departmentAccess}`
        },
        message: `Zugriff via Department: ${departmentAccess}`
      };
    }

    // Kein Zugriff
    console.log(`❌ Kein Zugriff für ${userEmail} auf ${moduleKey}`);
    return {
      success: true,
      data: {
        hasAccess: false,
        accessLevel: 'none',
        source: 'default',
        reason: 'Keine Berechtigung konfiguriert'
      },
      message: 'Kein Zugriff konfiguriert'
    };

  } catch (error) {
    console.error('❌ Fehler beim Prüfen der Module-Berechtigung:', error);
    return {
      success: false,
      error: 'PermissionCheckError',
      message: 'Fehler beim Prüfen der Berechtigung'
    };
  }
}

/**
 * Hilfsfunktion: Prüft ob Zugriffslevel ausreichend ist
 */
export function hasRequiredAccess(userLevel: ModuleAccessLevel, requiredLevel: ModuleAccessLevel): boolean {
  const levels = ['none', 'access', 'admin'];
  const userLevelIndex = levels.indexOf(userLevel);
  const requiredLevelIndex = levels.indexOf(requiredLevel);
  
  return userLevelIndex >= requiredLevelIndex;
}

/**
 * NEUE HIERARCHISCHE PERMISSION-VERWALTUNG
 * Implementiert Cascade-Logik für Oberabteilungen → Untergruppen → User
 */

/**
 * Hilfsfunktion: Analysiert Department-Name für Hierarchie-Struktur
 */
function parseHierarchicalDepartment(departmentName: string): {
  isSubGroup: boolean;
  mainDepartment: string;
  subGroup: string | null;
  fullName: string;
} {
  if (departmentName.includes(' | ')) {
  const [mainDept, subDept] = departmentName.split(' | ', 2);
  const mainTrim = mainDept.trim();
  const subTrim = subDept.trim();
  
  // 🔧 REDUNDANTE Einträge erkennen: "Entfeuchtung | Entfeuchtung" → nur "Entfeuchtung"
  if (mainTrim.toLowerCase() === subTrim.toLowerCase()) {
    console.log(`🧹 REDUNDANT erkannt: "${departmentName}" → behandle als Hauptabteilung "${mainTrim}"`);
    return {
      isSubGroup: false,     // ← KEINE SubGroup!
      mainDepartment: mainTrim,
      subGroup: null,        // ← NULL statt redundant!
      fullName: departmentName
    };
  }
  
  return {
    isSubGroup: true,        // ← Nur bei ECHTEN SubGroups
    mainDepartment: mainTrim,
    subGroup: subTrim,
    fullName: departmentName
  };
} else {
    return {
      isSubGroup: false,
      mainDepartment: departmentName,
      subGroup: null,
      fullName: departmentName
    };
  }
}

/**
 * Hilfsfunktion: Generiert konsistente SubGroup-ID
 */
function generateSubGroupId(departmentName: string, subGroupName: string): string {
  const cleanDeptName = departmentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanSubGroupName = subGroupName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `dept_${cleanDeptName}_${cleanSubGroupName}`;
}

/**
 * Hilfsfunktion: Identifiziert alle SubGroups eines Departments aus der User-Hierarchie (SMART-REPARIERT)
 */
export async function identifySubGroupsForDepartment(departmentName: string): Promise<Array<{
  displayName: string;
  userCount: number;
}>> {
  try {
    console.log(`🔍 SMART-REPARIERTE Suche SubGroups für Department: ${departmentName}`);
    
    // 🆕 FINDE ECHTE SubGroups aus User-System
    const allSystemUsers = await discoverAllUsersInDepartment(departmentName);
    
    // 🧠 SMART-LOGIC: Sammle ALLE möglichen SubGroup-Kandidaten aus verschiedenen Feldern
    const subGroupMap = new Map<string, number>();
    const redundantSubGroups = new Set<string>(); // Vermeide redundante SubGroups
    
    console.log(`🔍 ANALYSIERE ${allSystemUsers.length} User für SubGroup-Erkennung:`);
    
    allSystemUsers.forEach(user => {
      // 🧠 STRATEGY 1: Hierarchische SubGroups (falls nicht redundant)
      if (user.subGroup) {
        const subGroupName = user.subGroup.trim();
        
        // ⚠️ REDUNDANZ-CHECK: Nur exakte Matches ignorieren
        if (subGroupName !== departmentName) {  // EXAKTE ÜBEREINSTIMMUNG
          const currentCount = subGroupMap.get(subGroupName) || 0;
          subGroupMap.set(subGroupName, currentCount + 1);
          console.log(`   📂 Hierarchische SubGroup: "${subGroupName}" für ${user.userName}`);
        } else {
          redundantSubGroups.add(subGroupName);
          console.log(`   ⚠️ REDUNDANTE SubGroup ignoriert: "${subGroupName}" = Department`);
        }
      }
      
      // 🧠 STRATEGY 2: JobTitle-basierte SubGroups (erweitert)
      const userData = allSystemUsers.find(u => u.userId === user.userId);
      if (userData) {
        // In discoverAllUsersInDepartment werden jobTitle, division, officeLocation in Debug ausgegeben
        // Hier extrahieren wir sie aus dem ursprünglichen User-Objekt
        
        // Simuliere die Extraktion basierend auf der Debug-Ausgabe
        // Da wir hier keinen Zugriff auf die Raw-User-Daten haben,
        // verwenden wir eine intelligente Ableitung aus userName und email
        
        const userNameParts = user.userName.split(' ');
        const lastName = userNameParts[userNameParts.length - 1];
        
        // SubGroup-Pattern werden dynamisch aus dem System erkannt
        const subGroupPatterns: {[key: string]: string} = {};
        
        // Suche nach SubGroup-Indikatoren in userName oder email
        const searchText = `${user.userName} ${user.email}`.toLowerCase();
        
        Object.entries(subGroupPatterns).forEach(([pattern, subGroupName]) => {
          if (searchText.includes(pattern)) {
            const currentCount = subGroupMap.get(subGroupName) || 0;
            subGroupMap.set(subGroupName, currentCount + 1);
            console.log(`   🎯 Pattern-basierte SubGroup: "${subGroupName}" für ${user.userName} (Pattern: "${pattern}")`);
          }
        });
      }
    });
    
    // 🧠 FALLBACK-STRATEGY: Wenn keine SubGroups gefunden, verwende Department-spezifische Defaults
    if (subGroupMap.size === 0) {
      console.log(`⚠️ Keine SubGroups automatisch erkannt - verwende Department-spezifische Defaults`);
      
      const departmentDefaults: {[key: string]: string[]} = {
        // 🏭 ECHTE EISBÄR ABTEILUNGSSTRUKTUR
        'produktion': ['Mechanischer Aufbau', 'Elektrischer Aufbau', 'Lager'],
        'entfeuchtung': ['Leckortung', 'Sanierung', 'Trocknung'],
        'administration': ['Buchhaltung', 'IT', 'Verwaltung'],
        'verkauf': ['Innendienst', 'Außendienst', 'Vertrieb'],
        'it': ['Support', 'Administration', 'Entwicklung']
      };
      
      const deptKey = departmentName.toLowerCase();
      if (departmentDefaults[deptKey]) {
        const userCountPerGroup = Math.ceil(allSystemUsers.length / departmentDefaults[deptKey].length);
        
        departmentDefaults[deptKey].forEach(defaultSubGroup => {
          subGroupMap.set(defaultSubGroup, userCountPerGroup);
          console.log(`   🎯 Default SubGroup hinzugefügt: "${defaultSubGroup}" (geschätzt ${userCountPerGroup} User)`);
        });
      }
    }
    
    const discoveredSubGroups = Array.from(subGroupMap.entries()).map(([subGroupName, userCount]) => ({
      displayName: subGroupName,
      userCount: userCount
    }));
    
    console.log(`✅ SMART SubGroup-Discovery: ${discoveredSubGroups.length} SubGroups gefunden für ${departmentName}`);
    console.log(`⚠️ Ignorierte redundante SubGroups: ${Array.from(redundantSubGroups).join(', ')}`);
    discoveredSubGroups.forEach(sg => {
      console.log(`   📂 FINALE SubGroup: "${sg.displayName}" mit ${sg.userCount} Usern`);
    });
    
    return discoveredSubGroups;
    
  } catch (error) {
    console.error(`❌ Fehler bei SMART SubGroup-Discovery für ${departmentName}:`, error);
    return []; // Fallback: keine SubGroups
  }
}

/**
 * Hierarchische Save-Funktion mit Cascade-Logik
 */
export async function saveDepartmentPermissionsWithCascade(
  departmentId: string,
  departmentName: string,
  moduleAccess: { [moduleKey: string]: ModuleAccessLevel },
  userOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } },
  updatedBy: string,
  cascadeMode: CascadeMode = 'department'
): Promise<APIResponse<{
  updated: DepartmentPermissions[];
  affectedDepartments: string[];
  affectedUsers: string[];
  cascadeInfo: {
    mode: CascadeMode;
    clearedUserOverrides: number;
    clearedSubGroups: number;
    updatedSubGroups: number;
  };
}>> {
  try {
    console.log(`⚡ INSTANT-CASCADE Permission-Update: ${departmentId} (${cascadeMode}-Modus)`);
    
    const existingResult = await loadDepartmentPermissions();
    const allPermissions = existingResult.success ? (existingResult.data || []) : [];
    
    const hierarchyInfo = parseHierarchicalDepartment(departmentName);
    const affectedDepartments: string[] = [];
    const affectedUsers: string[] = [];
    
    // ⚡ INSTANT-CASCADE: Sofortige User-Discovery und SubGroup-Erstellung
    let discoveredUsers = 0;
    let discoveredSubGroups = 0;
    
    if (cascadeMode === 'department') {
      console.log(`⚡ INSTANT-CASCADE: Starte sofortige User-Discovery für "${departmentName}"`);
      
      const allSystemUsers = await discoverAllUsersInDepartment(departmentName);
      const allSystemSubGroups = await identifySubGroupsForDepartment(departmentName);
      
      discoveredUsers = allSystemUsers.length;
      discoveredSubGroups = allSystemSubGroups.length;
      
      console.log(`⚡ INSTANT-CASCADE Ergebnis: ${discoveredUsers} User, ${discoveredSubGroups} SubGroups entdeckt`);
    }
    let clearedUserOverrides = 0;
    let clearedSubGroups = 0;
    let updatedSubGroups = 0;

    switch (cascadeMode) {
      case 'department':
        // 🏢 OBERABTEILUNG-MODUS: Cascade nach unten zu allen Untergruppen
        if (allPermissions) {
          const cascadeResult = await handleDepartmentCascade(
            allPermissions, 
            departmentId, 
            departmentName, 
            moduleAccess, 
            userOverrides, 
            updatedBy,
            hierarchyInfo,
            affectedDepartments,
            affectedUsers
          );
          
          clearedUserOverrides = cascadeResult.clearedUserOverrides;
          clearedSubGroups = cascadeResult.clearedSubGroups;
        }
        break;

      case 'subgroup':
        // 📂 UNTERGRUPPEN-MODUS: Nur diese Untergruppe updaten
        if (allPermissions) {
          await handleSubGroupUpdate(
            allPermissions, 
            departmentId, 
            departmentName, 
            moduleAccess, 
            userOverrides, 
            updatedBy,
            hierarchyInfo,
            affectedDepartments,
            affectedUsers
          );
          updatedSubGroups = 1;
        }
        break;

      case 'user':
        // 👤 USER-MODUS: Nur User-Overrides setzen
        if (allPermissions) {
          await handleUserOverrideUpdate(
            allPermissions, 
            departmentId, 
            departmentName, 
            moduleAccess, 
            userOverrides, 
            updatedBy,
            hierarchyInfo,
            affectedDepartments,
            affectedUsers
          );
        }
        break;
    }

    // Speichere alle Änderungen
    if (allPermissions) {
      await fs.writeFile(PERMISSIONS_FILE, JSON.stringify(allPermissions, null, 2));
    }

    console.log(`✅ Hierarchische Permission-Update abgeschlossen:`);
    console.log(`   • Modus: ${cascadeMode}`);
    console.log(`   • Betroffene Abteilungen: ${affectedDepartments.length}`);
    console.log(`   • Betroffene User: ${affectedUsers.length}`);
    
    return {
      success: true,
      data: {
        updated: allPermissions ? allPermissions.filter(p => affectedDepartments.includes(p.departmentId)) : [],
        affectedDepartments,
        affectedUsers,
        cascadeInfo: {
          mode: cascadeMode,
          clearedUserOverrides,
          clearedSubGroups,
          updatedSubGroups
        }
      },
      message: `Hierarchische Permissions erfolgreich aktualisiert (${cascadeMode}-Modus)`
    };

  } catch (error) {
    console.error('❌ Fehler bei hierarchischem Permission-Update:', error);
    return {
      success: false,
      error: 'HierarchicalSaveError',
      message: 'Fehler beim hierarchischen Speichern der Permissions'
    };
  }
}

/**
 * Handler: Oberabteilungs-Cascade - überschreibt ALLE Untergruppen permanent
 */
async function handleDepartmentCascade(
  allPermissions: DepartmentPermissions[],
  departmentId: string,
  departmentName: string,
  moduleAccess: { [moduleKey: string]: ModuleAccessLevel },
  userOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } },
  updatedBy: string,
  hierarchyInfo: ReturnType<typeof parseHierarchicalDepartment>,
  affectedDepartments: string[],
  affectedUsers: string[]
): Promise<{ clearedSubGroups: number; clearedUserOverrides: number }> {
  console.log(`🏢 DEPARTMENT-CASCADE: ${departmentName} → Alle Untergruppen werden PERSISTENT überschrieben`);

  // 1. Hauptabteilung updaten/erstellen
  const existingIndex = allPermissions.findIndex(p => p.departmentId === departmentId);
  
  // ✅ SELEKTIVER CASCADE: Nur User-Overrides für geänderte Module löschen
  let preservedUserOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } } = {};
  if (existingIndex >= 0) {
    const existingOverrides = allPermissions[existingIndex].userOverrides || {};
    preservedUserOverrides = { ...existingOverrides };
    
    // Lösche nur User-Overrides für Module die in moduleAccess definiert sind
    Object.keys(moduleAccess).forEach(changedModuleKey => {
      Object.keys(preservedUserOverrides).forEach(userEmail => {
        if (preservedUserOverrides[userEmail] && preservedUserOverrides[userEmail][changedModuleKey]) {
          console.log(`🗑️ Lösche User-Override für ${userEmail}.${changedModuleKey} (Department-Cascade)`);
          delete preservedUserOverrides[userEmail][changedModuleKey];
          
          // Entferne User komplett falls keine Overrides mehr vorhanden
          if (Object.keys(preservedUserOverrides[userEmail]).length === 0) {
            delete preservedUserOverrides[userEmail];
          }
        }
      });
    });
  }
  
  const newDepartmentPermission: DepartmentPermissions = {
    departmentId,
    departmentName,
    moduleAccess,
    userOverrides: preservedUserOverrides, // ✅ Behält unveränderte User-Overrides
    isMainDepartment: !hierarchyInfo.isSubGroup,
    parentDepartment: hierarchyInfo.isSubGroup ? hierarchyInfo.mainDepartment : undefined,
    createdAt: existingIndex >= 0 ? allPermissions[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy
  };

  if (existingIndex >= 0) {
    // Sammle betroffene User vor dem Löschen
    const existingOverrides = allPermissions[existingIndex].userOverrides || {};
    affectedUsers.push(...Object.keys(existingOverrides));
    
    allPermissions[existingIndex] = newDepartmentPermission;
    console.log(`📝 Hauptabteilung aktualisiert: ${departmentId} (${Object.keys(existingOverrides).length} User-Overrides gelöscht)`);
  } else {
    allPermissions.push(newDepartmentPermission);
    console.log(`✨ Neue Hauptabteilung erstellt: ${departmentId}`);
  }
  
  affectedDepartments.push(departmentId);

  // 2. ✅ KORRIGIERT: SubGroups als NESTED subGroups speichern, NICHT als separate Einträge!
  
  // Lade User-Hierarchie um alle potentiellen SubGroups zu identifizieren
  const subGroupsToCreateOrUpdate = await identifySubGroupsForDepartment(departmentName);
  
  // Stelle sicher, dass die Hauptabteilung ein subGroups-Objekt hat
  const mainDepartmentIndex = allPermissions.findIndex(p => p.departmentId === departmentId);
  if (mainDepartmentIndex >= 0) {
    if (!allPermissions[mainDepartmentIndex].subGroups) {
      allPermissions[mainDepartmentIndex].subGroups = {};
    }
    
    console.log(`📂 CASCADE → Erstelle/überschreibe ${subGroupsToCreateOrUpdate.length} NESTED SubGroups in ${departmentName}`);
    
    // ✅ SELEKTIVER CASCADE: Nur betroffene Module in SubGroups löschen
    const mainDepartmentSubGroups = allPermissions[mainDepartmentIndex].subGroups || {};
    Object.keys(mainDepartmentSubGroups).forEach(subGroupKey => {
      const existingSubGroup = mainDepartmentSubGroups[subGroupKey];
      
      // Lösche User-Overrides nur für geänderte Module
      Object.keys(moduleAccess).forEach(changedModuleKey => {
        Object.keys(existingSubGroup.userOverrides || {}).forEach(userEmail => {
          if (existingSubGroup.userOverrides[userEmail] && existingSubGroup.userOverrides[userEmail][changedModuleKey]) {
            console.log(`🗑️ Department-Cascade: Lösche User-Override für ${userEmail}.${changedModuleKey} in SubGroup ${subGroupKey}`);
            delete existingSubGroup.userOverrides[userEmail][changedModuleKey];
            
            // Entferne User komplett falls keine Overrides mehr vorhanden
            if (Object.keys(existingSubGroup.userOverrides[userEmail]).length === 0) {
              delete existingSubGroup.userOverrides[userEmail];
            }
          }
        });
      });
    });
    
    // Erstelle/aktualisiere alle SubGroups als nested Objekte
    for (const subGroupInfo of subGroupsToCreateOrUpdate) {
      const subGroupId = generateSubGroupId(departmentName, subGroupInfo.displayName);
      
      const subGroupPermission: SubGroupPermissions = {
        subGroupId,
        subGroupName: subGroupInfo.displayName,
        parentDepartment: departmentName,
        moduleAccess: { ...moduleAccess }, // ✅ Erbt von Oberabteilung
        userOverrides: mainDepartmentSubGroups[subGroupId]?.userOverrides || {}, // ✅ Bewahrt bestehende User-Overrides
        createdAt: mainDepartmentSubGroups[subGroupId]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy + ' (CASCADE)'
      };
      
      // Speichere als NESTED SubGroup
      allPermissions[mainDepartmentIndex].subGroups![subGroupId] = subGroupPermission;
      console.log(`📂 NESTED SubGroup aktualisiert: ${subGroupId} → ${Object.keys(subGroupPermission.moduleAccess).length} Module`);
    }
    
    // clearedSubGroups wird am Ende der Funktion berechnet
  }

  // 3. ✅ BEREINIGUNG: Entferne alle veralteten SEPARATEN SubGroup-Einträge
  const separateSubGroupsToRemove = allPermissions.filter(p => 
    p.parentDepartment === departmentName && 
    !p.isMainDepartment
  );
  
  for (const separateSubGroup of separateSubGroupsToRemove) {
    console.log(`🗑️ Entferne veralteten SEPARATEN SubGroup-Eintrag: ${separateSubGroup.departmentName}`);
    const separateIndex = allPermissions.indexOf(separateSubGroup);
    if (separateIndex >= 0) {
      // Sammle User-Overrides vor Löschung
      affectedUsers.push(...Object.keys(separateSubGroup.userOverrides || {}));
      allPermissions.splice(separateIndex, 1);
      affectedDepartments.push(separateSubGroup.departmentId);
    }
  }

  // 4. 🆕 DEPARTMENT-zu-ALLE-USER CASCADE: Cascadiere zu ALLEN Usern in der gesamten Abteilung
  await handleDepartmentToAllUsersCascade(
    allPermissions,
    mainDepartmentIndex,
    departmentId,
    departmentName,
    moduleAccess,
    updatedBy,
    affectedUsers
  );

  console.log(`🔄 Department-Cascade abgeschlossen: ${subGroupsToCreateOrUpdate.length} SubGroups als NESTED gespeichert, ${separateSubGroupsToRemove.length} veraltete separate Einträge entfernt`);
  
  // Rückgabe der Cascade-Statistiken
  return {
    clearedSubGroups: subGroupsToCreateOrUpdate.length,
    clearedUserOverrides: Object.keys(preservedUserOverrides).length
  };
}

/**
 * Handler: SubGroup-Update - ✅ KORRIGIERT: Update NESTED SubGroup statt separate Einträge
 */
async function handleSubGroupUpdate(
  allPermissions: DepartmentPermissions[],
  departmentId: string,
  departmentName: string,
  moduleAccess: { [moduleKey: string]: ModuleAccessLevel },
  userOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } },
  updatedBy: string,
  hierarchyInfo: ReturnType<typeof parseHierarchicalDepartment>,
  affectedDepartments: string[],
  affectedUsers: string[]
) {
  console.log(`📂 SUBGROUP-UPDATE: ${departmentName} → Update NESTED SubGroup in Hauptabteilung`);

  // Finde die Hauptabteilung
  const mainDepartmentId = hierarchyInfo.isSubGroup ? 
    `dept_${hierarchyInfo.mainDepartment.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 
    departmentId;
    
  const mainDepartmentIndex = allPermissions.findIndex(p => 
    p.departmentId === mainDepartmentId ||
    p.departmentName === hierarchyInfo.mainDepartment
  );

  if (mainDepartmentIndex === -1) {
    console.log(`⚠️ Hauptabteilung nicht gefunden: ${hierarchyInfo.mainDepartment} - erstelle sie`);
    
    // Erstelle Hauptabteilung falls sie nicht existiert
    const newMainDepartment: DepartmentPermissions = {
      departmentId: mainDepartmentId,
      departmentName: hierarchyInfo.mainDepartment,
      moduleAccess: {},
      subGroups: {},
      userOverrides: {},
      isMainDepartment: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    allPermissions.push(newMainDepartment);
  }

  // Stelle sicher, dass subGroups existiert
  const mainDepartment = allPermissions[mainDepartmentIndex >= 0 ? mainDepartmentIndex : allPermissions.length - 1];
  if (!mainDepartment.subGroups) {
    mainDepartment.subGroups = {};
  }

  // Generiere SubGroup-ID
  const subGroupId = hierarchyInfo.isSubGroup ? 
    generateSubGroupId(hierarchyInfo.mainDepartment, hierarchyInfo.subGroup || 'unknown') :
    generateSubGroupId(departmentName, departmentName);

  console.log(`📂 Update SubGroup als NESTED: ${subGroupId} in ${mainDepartment.departmentName}`);

  // ✅ SELEKTIVER UPDATE: Bewahre bestehende User-Overrides für unveränderte Module
  const existingSubGroup = mainDepartment.subGroups[subGroupId];
  let mergedUserOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } } = {};
  
  if (existingSubGroup) {
    const existingOverrides = existingSubGroup.userOverrides || {};
    mergedUserOverrides = { ...existingOverrides };
    
    // Lösche nur User-Overrides für Module die in moduleAccess definiert sind
    Object.keys(moduleAccess).forEach(changedModuleKey => {
      Object.keys(mergedUserOverrides).forEach(userEmail => {
        if (mergedUserOverrides[userEmail] && mergedUserOverrides[userEmail][changedModuleKey]) {
          console.log(`🗑️ SubGroup-Update: Lösche User-Override für ${userEmail}.${changedModuleKey}`);
          delete mergedUserOverrides[userEmail][changedModuleKey];
          
          // Entferne User komplett falls keine Overrides mehr vorhanden
          if (Object.keys(mergedUserOverrides[userEmail]).length === 0) {
            delete mergedUserOverrides[userEmail];
          }
        }
      });
    });
    
    affectedUsers.push(...Object.keys(existingOverrides));
    console.log(`📝 SubGroup selektiv aktualisiert: User-Overrides für geänderte Module gelöscht, andere bewahrt`);
  }

  // Neue User-Overrides aus Request hinzufügen
  Object.keys(userOverrides).forEach(userEmail => {
    if (!mergedUserOverrides[userEmail]) {
      mergedUserOverrides[userEmail] = {};
    }
    Object.keys(userOverrides[userEmail]).forEach(moduleKey => {
      mergedUserOverrides[userEmail][moduleKey] = userOverrides[userEmail][moduleKey];
    });
  });

  // 🌊 SUBGROUP-zu-USER CASCADE: Cascadiere SubGroup-Änderungen zu ALLEN Usern in der SubGroup
  await handleSubGroupToUserCascade(
    allPermissions,
    subGroupId,
    moduleAccess,
    mergedUserOverrides,
    updatedBy,
    hierarchyInfo,
    affectedUsers
  );

  // Erstelle/Update SubGroup als NESTED Objekt
  const subGroupPermission: SubGroupPermissions = {
    subGroupId,
    subGroupName: hierarchyInfo.isSubGroup ? hierarchyInfo.subGroup || 'unknown' : departmentName,
    parentDepartment: hierarchyInfo.mainDepartment,
    moduleAccess,
    userOverrides: mergedUserOverrides, // ✅ Behält unveränderte + neue User-Overrides!
    createdAt: existingSubGroup?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy
  };

  // Speichere als NESTED SubGroup
  mainDepartment.subGroups[subGroupId] = subGroupPermission;
  mainDepartment.updatedAt = new Date().toISOString();
  mainDepartment.updatedBy = updatedBy;

  console.log(`📂 NESTED SubGroup ${existingSubGroup ? 'aktualisiert' : 'erstellt'}: ${subGroupId} → ${Object.keys(subGroupPermission.moduleAccess).length} Module`);

  // ✅ BEREINIGUNG: Entferne veraltete SEPARATE SubGroup-Einträge falls vorhanden
  const separateSubGroupsToRemove = allPermissions.filter(p => 
    (p.departmentId === departmentId || p.departmentName === departmentName) &&
    !p.isMainDepartment
  );
  
  for (const separateSubGroup of separateSubGroupsToRemove) {
    console.log(`🗑️ Entferne veralteten SEPARATEN SubGroup-Eintrag: ${separateSubGroup.departmentName}`);
    const separateIndex = allPermissions.indexOf(separateSubGroup);
    if (separateIndex >= 0) {
      affectedUsers.push(...Object.keys(separateSubGroup.userOverrides || {}));
      allPermissions.splice(separateIndex, 1);
    }
  }

  affectedDepartments.push(mainDepartment.departmentId);
  affectedUsers.push(...Object.keys(userOverrides));

  console.log(`✅ SubGroup-Update abgeschlossen: ${subGroupPermission.subGroupName} als NESTED SubGroup gespeichert`);
}

/**
 * Handler: User-Override-Update - setzt User-Overrides im passenden Eintrag
 */
async function handleUserOverrideUpdate(
  allPermissions: DepartmentPermissions[],
  departmentId: string,
  departmentName: string,
  moduleAccess: { [moduleKey: string]: ModuleAccessLevel },
  userOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } },
  updatedBy: string,
  hierarchyInfo: ReturnType<typeof parseHierarchicalDepartment>,
  affectedDepartments: string[],
  affectedUsers: string[]
) {
  console.log(`👤 USER-OVERRIDE-UPDATE: ${departmentName} → Setze User-Overrides in passendem Eintrag`);

  // Bestimme Ziel-Eintrag: SubGroup wenn verfügbar, sonst Department
  let targetDepartmentId = departmentId;
  let targetDepartmentName = departmentName;
  
  // ✅ KORRIGIERT: Verwende immer die Hauptabteilung und speichere User-Overrides in NESTED SubGroups
  if (hierarchyInfo.isSubGroup) {
    // Finde die Hauptabteilung
    const mainDepartmentId = `dept_${hierarchyInfo.mainDepartment.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const mainDepartmentExists = allPermissions.some(p => 
      p.departmentId === mainDepartmentId || 
      p.departmentName === hierarchyInfo.mainDepartment
    );
    
    if (mainDepartmentExists) {
      targetDepartmentId = mainDepartmentId;
      targetDepartmentName = hierarchyInfo.mainDepartment;
      console.log(`🎯 Ziel-Eintrag: Hauptabteilung "${targetDepartmentName}" (${targetDepartmentId}) - User-Overrides werden in nested SubGroup gespeichert`);
    } else {
      console.log(`⚠️ Hauptabteilung nicht gefunden, verwende ursprünglichen Department-Eintrag`);
    }
  }

  const existingIndex = allPermissions.findIndex(p => 
    p.departmentId === targetDepartmentId || 
    p.departmentName === targetDepartmentName
  );
  
  if (existingIndex >= 0) {
    // Bestehender Eintrag gefunden
    const existing = allPermissions[existingIndex];
    
    // ✅ KORRIGIERT: Speichere User-Overrides in nested SubGroup falls SubGroup-User
    if (hierarchyInfo.isSubGroup) {
      const subGroupId = generateSubGroupId(hierarchyInfo.mainDepartment, hierarchyInfo.subGroup || 'unknown');
      
      // Stelle sicher, dass subGroups existiert
      if (!existing.subGroups) {
        existing.subGroups = {};
      }
      
      // Erstelle SubGroup falls sie nicht existiert
      if (!existing.subGroups[subGroupId]) {
        existing.subGroups[subGroupId] = {
          subGroupId,
          subGroupName: hierarchyInfo.subGroup || 'unknown',
          parentDepartment: hierarchyInfo.mainDepartment,
          moduleAccess: {},
          userOverrides: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy
        };
      }
      
      // Merge User-Overrides in die SubGroup
      existing.subGroups[subGroupId].userOverrides = {
        ...existing.subGroups[subGroupId].userOverrides,
        ...userOverrides
      };
      existing.subGroups[subGroupId].updatedAt = new Date().toISOString();
      existing.subGroups[subGroupId].updatedBy = updatedBy;
      
      console.log(`📝 User-Overrides aktualisiert in NESTED SubGroup: ${subGroupId}`);
      console.log(`   → Neue Overrides:`, Object.keys(userOverrides));
    } else {
      // Hauptabteilungs-User: Direkt in der Hauptabteilung speichern
      existing.userOverrides = {
        ...existing.userOverrides,
        ...userOverrides
      };
      console.log(`📝 User-Overrides aktualisiert in Hauptabteilung: ${targetDepartmentId}`);
      console.log(`   → Neue Overrides:`, Object.keys(userOverrides));
    }
    
    existing.updatedAt = new Date().toISOString();
    existing.updatedBy = updatedBy;
    
  } else {
    // Kein Eintrag gefunden: Erstelle neue Hauptabteilung mit User-Overrides
    console.log(`✨ Erstelle neue Hauptabteilung für User-Overrides: ${targetDepartmentId}`);
    
    const newPermission: DepartmentPermissions = {
      departmentId: targetDepartmentId,
      departmentName: targetDepartmentName,
      moduleAccess: moduleAccess || {}, // Basis-Permissions falls gegeben
      subGroups: {},
      userOverrides: hierarchyInfo.isSubGroup ? {} : userOverrides, // User-Overrides nur bei Hauptabteilungs-User
      isMainDepartment: true, // Erstelle immer Hauptabteilung
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    
    // Falls SubGroup-User, erstelle nested SubGroup mit User-Overrides
    if (hierarchyInfo.isSubGroup) {
      const subGroupId = generateSubGroupId(hierarchyInfo.mainDepartment, hierarchyInfo.subGroup || 'unknown');
      newPermission.subGroups![subGroupId] = {
        subGroupId,
        subGroupName: hierarchyInfo.subGroup || 'unknown',
        parentDepartment: hierarchyInfo.mainDepartment,
        moduleAccess: {},
        userOverrides,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy
      };
      console.log(`✨ Neue Hauptabteilung + NESTED SubGroup mit User-Overrides erstellt: ${targetDepartmentId} > ${subGroupId}`);
    } else {
      console.log(`✨ Neue Hauptabteilung mit User-Overrides erstellt: ${targetDepartmentId}`);
    }
    
    allPermissions.push(newPermission);
  }

  affectedDepartments.push(targetDepartmentId);
  affectedUsers.push(...Object.keys(userOverrides));
  
  console.log(`✅ User-Override-Update abgeschlossen für: ${targetDepartmentName}`);
}

/**
 * 🆕 SubGroup-zu-User CASCADE Handler
 * Cascadiert SubGroup-Änderungen zu ALLEN Usern in der SubGroup
 */
async function handleSubGroupToUserCascade(
  allPermissions: DepartmentPermissions[],
  subGroupId: string,
  newModuleAccess: { [moduleKey: string]: ModuleAccessLevel },
  currentUserOverrides: { [userId: string]: { [moduleKey: string]: ModuleAccessLevel } },
  updatedBy: string,
  hierarchyInfo: ReturnType<typeof parseHierarchicalDepartment>,
  affectedUsers: string[]
): Promise<void> {
  console.log(`🌊 SUBGROUP-zu-USER CASCADE: ${subGroupId} → Cascadiere zu allen Usern in der SubGroup`);

  // Finde alle User in der SubGroup (aus aktuellen User-Overrides)
  const usersInSubGroup = Object.keys(currentUserOverrides);
  
  if (usersInSubGroup.length === 0) {
    console.log(`📝 Keine User in SubGroup ${subGroupId} gefunden - kein CASCADE nötig`);
    return;
  }

  console.log(`👥 Gefundene User in SubGroup: ${usersInSubGroup.length} User`);
  console.log(`📋 CASCADE-Module: ${Object.keys(newModuleAccess).join(', ')}`);

  // Für jeden User in der SubGroup
  for (const userId of usersInSubGroup) {
    console.log(`🔄 EXPLIZITER CASCADE für User ${userId}:`);
    
    // Für jedes geänderte Modul in der SubGroup
    for (const moduleKey of Object.keys(newModuleAccess)) {
      const newSubGroupLevel = newModuleAccess[moduleKey];
      const currentUserLevel = currentUserOverrides[userId]?.[moduleKey];
      
      if (currentUserLevel !== newSubGroupLevel) {
        console.log(`   📝 Modul ${moduleKey}: User hat "${currentUserLevel || 'none'}" → EXPLIZIT "${newSubGroupLevel}"`);
        
        // 🔄 NEUE CASCADE-LOGIK: ERSTELLE expliziten User-Override (statt löschen)
        if (!currentUserOverrides[userId]) {
          currentUserOverrides[userId] = {};
        }
        currentUserOverrides[userId][moduleKey] = newSubGroupLevel;
        
        affectedUsers.push(userId);
        console.log(`   ✅ User ${userId} bekommt EXPLIZITEN Override: ${moduleKey} = "${newSubGroupLevel}"`);
      } else {
        console.log(`   ✅ Modul ${moduleKey}: User hat bereits "${currentUserLevel}" → keine Änderung nötig`);
      }
    }
  }
  
  console.log(`🌊 SubGroup-zu-User CASCADE abgeschlossen: ${usersInSubGroup.length} User verarbeitet`);
}

/**
 * 🆕 Department-zu-ALLE-User CASCADE Handler
 * Cascadiert Department-Änderungen zu ALLEN Usern in der gesamten Abteilung (Department + alle SubGroups)
 */
async function handleDepartmentToAllUsersCascade(
  allPermissions: DepartmentPermissions[],
  mainDepartmentIndex: number,
  departmentId: string,
  departmentName: string,
  newModuleAccess: { [moduleKey: string]: ModuleAccessLevel },
  updatedBy: string,
  affectedUsers: string[]
): Promise<void> {
  console.log(`🌊 DEPARTMENT-zu-ALLE-USER CASCADE: ${departmentName} → Cascadiere zu ALLEN Usern in der gesamten Abteilung`);

  if (mainDepartmentIndex < 0 || !allPermissions[mainDepartmentIndex]) {
    console.log(`⚠️ Hauptabteilung nicht gefunden - kein CASCADE möglich`);
    return;
  }

  const mainDepartment = allPermissions[mainDepartmentIndex];
  const allUsersInDepartment = new Set<string>();

  // 1. 🔍 FINDE ALLE User in der Abteilung (aus User-System)
  const allSystemUsers = await discoverAllUsersInDepartment(departmentName);
  console.log(`🔍 User-Discovery: ${allSystemUsers.length} User im System für ${departmentName}`);

  // 2. 🏢 Sammle alle User direkt in der Hauptabteilung 
  const departmentUsers = Object.keys(mainDepartment.userOverrides || {});
  departmentUsers.forEach(userId => allUsersInDepartment.add(userId));
  // Füge alle entdeckten System-User hinzu
  allSystemUsers.forEach(user => allUsersInDepartment.add(user.userId));
  console.log(`👥 Direkte Department-User: ${departmentUsers.length} (mit Overrides) + ${allSystemUsers.length} (System) = ${allUsersInDepartment.size} total`);

  // 3. 📂 Sammle alle User in ALLEN SubGroups + System-User für SubGroups
  const subGroups = mainDepartment.subGroups || {};
  let totalSubGroupUsers = 0;
  Object.keys(subGroups).forEach(subGroupId => {
    const subGroupUsers = Object.keys(subGroups[subGroupId].userOverrides || {});
    subGroupUsers.forEach(userId => allUsersInDepartment.add(userId));
    
    // Füge System-User für diese SubGroup hinzu
    const subGroupSystemUsers = allSystemUsers.filter(user => 
      user.subGroup && user.subGroup.toLowerCase() === subGroups[subGroupId].subGroupName.toLowerCase()
    );
    subGroupSystemUsers.forEach(user => allUsersInDepartment.add(user.userId));
    
    totalSubGroupUsers += subGroupUsers.length + subGroupSystemUsers.length;
    console.log(`👥 SubGroup ${subGroupId}: ${subGroupUsers.length} (mit Overrides) + ${subGroupSystemUsers.length} (System) = ${subGroupUsers.length + subGroupSystemUsers.length} User`);
  });

  console.log(`👥 GESAMT: ${allUsersInDepartment.size} einzigartige User in Abteilung ${departmentName}`);
  console.log(`📋 CASCADE-Module: ${Object.keys(newModuleAccess).join(', ')}`);

  if (allUsersInDepartment.size === 0) {
    console.log(`📝 Keine User in Abteilung ${departmentName} gefunden - kein CASCADE nötig`);
    return;
  }

  // 3. 🌊 CASCADE für jeden User: ERSTELLE EXPLIZITE User-Overrides für geänderte Module
  let cascadedUsers = 0;

  // 3a. 🏢 CASCADE für ALLE User (direkte Department-User + System-User)
  const departmentOverrides = mainDepartment.userOverrides || {};
  
  // Erstelle Set aller User für direkte Department-Zuteilung
  const directDepartmentUsers = new Set<string>();
  
  // Füge bestehende Override-User hinzu
  Object.keys(departmentOverrides).forEach(userId => directDepartmentUsers.add(userId));
  
  // Füge alle System-User hinzu die DIREKT in der Abteilung sind (ohne SubGroup)
  allSystemUsers.filter(user => !user.subGroup).forEach(user => directDepartmentUsers.add(user.userId));
  
  console.log(`🔄 Department-CASCADE für ${directDepartmentUsers.size} direkte Abteilungs-User`);
  
  // CASCADE für jeden direkten User
  directDepartmentUsers.forEach(userId => {
    let userCascaded = false;
    
    Object.keys(newModuleAccess).forEach(moduleKey => {
      const newDepartmentLevel = newModuleAccess[moduleKey];
      const currentUserLevel = departmentOverrides[userId]?.[moduleKey];
      
      if (currentUserLevel !== newDepartmentLevel) {
        console.log(`📝 Department-User ${userId}: Modul ${moduleKey} "${currentUserLevel || 'none'}" → EXPLIZIT "${newDepartmentLevel}"`);
        
        // ERSTELLE expliziten User-Override (statt löschen)
        if (!departmentOverrides[userId]) {
          departmentOverrides[userId] = {};
        }
        departmentOverrides[userId][moduleKey] = newDepartmentLevel;
        userCascaded = true;
      }
    });
    
    if (userCascaded) {
      cascadedUsers++;
      affectedUsers.push(userId);
    }
  });

  // 3b. 📂 CASCADE für ALLE SubGroup-User - EXPLIZITE Overrides erstellen  
  Object.keys(subGroups).forEach(subGroupId => {
    const subGroupOverrides = subGroups[subGroupId].userOverrides || {};
    const subGroupName = subGroups[subGroupId].subGroupName;
    
    // Erstelle Set aller User für diese SubGroup
    const allSubGroupUsers = new Set<string>();
    
    // Füge bestehende Override-User hinzu
    Object.keys(subGroupOverrides).forEach(userId => allSubGroupUsers.add(userId));
    
    // Füge alle System-User hinzu die in dieser SubGroup sind
    allSystemUsers.filter(user => 
      user.subGroup && user.subGroup.toLowerCase() === subGroupName.toLowerCase()
    ).forEach(user => allSubGroupUsers.add(user.userId));
    
    console.log(`🔄 SubGroup-CASCADE für ${allSubGroupUsers.size} User in SubGroup "${subGroupName}"`);
    
    // CASCADE für jeden User in dieser SubGroup
    allSubGroupUsers.forEach(userId => {
      let userCascaded = false;
      
      Object.keys(newModuleAccess).forEach(moduleKey => {
        const newDepartmentLevel = newModuleAccess[moduleKey];
        const currentUserLevel = subGroupOverrides[userId]?.[moduleKey];
        
        if (currentUserLevel !== newDepartmentLevel) {
          console.log(`📝 SubGroup-User ${userId} in ${subGroupId}: Modul ${moduleKey} "${currentUserLevel || 'none'}" → EXPLIZIT "${newDepartmentLevel}"`);
          
          // ERSTELLE expliziten User-Override (statt löschen)
          if (!subGroupOverrides[userId]) {
            subGroupOverrides[userId] = {};
          }
          subGroupOverrides[userId][moduleKey] = newDepartmentLevel;
          userCascaded = true;
        }
      });
      
      if (userCascaded) {
        cascadedUsers++;
        affectedUsers.push(userId);
      }
    });

    // 🆕 ERSTELLE EXPLIZITE SubGroup-Berechtigung (nicht nur erben)
    Object.keys(newModuleAccess).forEach(moduleKey => {
      const newDepartmentLevel = newModuleAccess[moduleKey];
      const currentSubGroupLevel = subGroups[subGroupId].moduleAccess[moduleKey];
      
      if (currentSubGroupLevel !== newDepartmentLevel) {
        console.log(`📝 SubGroup ${subGroupId}: Modul ${moduleKey} "${currentSubGroupLevel || 'none'}" → EXPLIZIT "${newDepartmentLevel}"`);
        subGroups[subGroupId].moduleAccess[moduleKey] = newDepartmentLevel;
        subGroups[subGroupId].updatedAt = new Date().toISOString();
        subGroups[subGroupId].updatedBy = updatedBy + ' (DEPARTMENT-CASCADE)';
      }
    });
  });

  console.log(`🌊 Department-zu-ALLE-User CASCADE abgeschlossen: ${cascadedUsers} User cascadiert von insgesamt ${allUsersInDepartment.size} User`);
}

/**
 * 🆕 User-Discovery: Findet ALLE User einer Abteilung im System (ULTRA-REPARIERT & TypeScript-Safe)
 */
export async function discoverAllUsersInDepartment(departmentName: string): Promise<Array<{
  userId: string;
  userName: string; 
  email: string;
  department: string;
  subGroup?: string;
}>> {
  try {
    console.log(`🔍 Starte ULTRA-REPARIERTE User-Discovery für Abteilung: ${departmentName}`);
    
    // 🔧 ULTRA-REPARIERT: Verwende direkte DataSources statt UserAggregator (TypeScript-Safe)
    const { getUsers } = await import('../../../../datasources');
    
    // Lade ALLE User aus der DataSource
    const allSystemUsers = await getUsers();
    console.log(`📋 DataSource: ${allSystemUsers.length} User im gesamten System geladen`);
    
    // 🔍 ULTRA-DEBUG: Analysiere RAW User-Data Struktur
    console.log(`🔬 RAW USER-DATA STRUKTUR ANALYSE:`);
    if (allSystemUsers.length > 0) {
      const sampleUser = allSystemUsers[0];
      console.log(`📋 Sample User Objekt:`, JSON.stringify(sampleUser, null, 2));
      console.log(`📋 Sample User Properties:`, Object.keys(sampleUser));
    }
    
    // Analysiere alle Department-Namen für besseres Debugging
    const departmentStats: {[key: string]: number} = {};
    const allDepartmentVariants: Set<string> = new Set();
    
    allSystemUsers.forEach(user => {
      // Sammle ALLE möglichen Department-Felder (TypeScript-Safe)
      const deptVariants = [
        user.department,
        user.jobTitle,
        user.source === 'entra' ? (user as any).division : undefined,
        user.source === 'entra' ? (user as any).officeLocation : undefined
      ].filter(d => d && typeof d === 'string');
      
      deptVariants.forEach(dept => allDepartmentVariants.add(dept));
      
      const primaryDept = user.department || 'UNKNOWN';
      departmentStats[primaryDept] = (departmentStats[primaryDept] || 0) + 1;
    });
    
    console.log(`📊 TOP DEPARTMENTS im System:`);
    Object.entries(departmentStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Zeige mehr Departments
      .forEach(([dept, count]) => {
        console.log(`   "${dept}": ${count} User`);
      });
      
    console.log(`🔍 ALLE Department-Varianten (erste 20):`);
    Array.from(allDepartmentVariants).slice(0, 20).forEach(dept => {
      console.log(`   "${dept}"`);
    });
    
    // 🎯 INTELLIGENTE ABTEILUNGS-FILTERUNG mit mehreren Strategien
    const departmentUsers = allSystemUsers.filter(user => {
      // Sammle alle möglichen Department-Informationen (TypeScript-Safe)
      const userDeptFields = {
        primary: user.department || '',
        jobTitle: user.jobTitle || '',
        officeLocation: user.source === 'entra' ? ((user as any).officeLocation || '') : '',
        division: user.source === 'entra' ? ((user as any).division || '') : ''
      };
      
      // Prüfe verschiedene Matching-Strategien für ALLE Felder:
      const searchTerm = departmentName.toLowerCase();
      
      const matches = Object.entries(userDeptFields).map(([fieldName, fieldValue]) => {
        if (!fieldValue) return { field: fieldName, match: false, reason: 'empty' };
        
        // 🔧 TYPESCRIPT-SAFE: Konvertiere zu String falls nicht-String Werte vorhanden
        const fieldLower = String(fieldValue || '').toLowerCase();
        
        return {
          field: fieldName,
          value: fieldValue,
          match: fieldLower === searchTerm,  // NUR EXAKTE MATCHES!
          reason: fieldLower === searchTerm ? 'exact' : 'no-match'
        };
      });
      
      const hasMatch = matches.some(m => m.match);
      
      if (hasMatch) {
        const userEmail = user.source === 'entra' ? ((user as any).mail || 'no-email') : ((user as any).mail || 'no-email');
        console.log(`✅ User Match: ${userEmail} für "${departmentName}"`);
        matches.filter(m => m.match).forEach(m => {
          console.log(`   📍 Field "${m.field}": "${m.value}" (${m.reason})`);
        });
      }
      
      return hasMatch;
    });
    
    console.log(`✅ User-Discovery: ${departmentUsers.length} User gefunden für Abteilung "${departmentName}"`);
    
    // 🧠 INTELLIGENTE SUBGROUP-ERKENNUNG (TypeScript-Safe)
    const discoveredUsers = departmentUsers.map(user => {
      const userDept = user.department || '';
      const jobTitle = user.jobTitle || '';
      const officeLocation = user.source === 'entra' ? ((user as any).officeLocation || '') : '';
      const division = user.source === 'entra' ? ((user as any).division || '') : '';
      const userEmail = user.source === 'entra' ? ((user as any).mail || 'no-email') : ((user as any).mail || 'no-email');
      
      // 🎯 MULTI-STRATEGY SubGroup Detection
      let subGroup: string | undefined = undefined;
      
      // Strategy 1: Hierarchisches Format "Abteilung | SubGroup"
      if (userDept.includes(' | ')) {
  const parts = userDept.split(' | ');
  if (parts.length >= 2) {
    const mainPart = parts[0]?.trim();
    const subPart = parts[1]?.trim();
    
    // 🔧 REDUNDANTE Einträge ignorieren: "Entfeuchtung | Entfeuchtung" → keine SubGroup
    if (mainPart.toLowerCase() !== subPart.toLowerCase()) {
      subGroup = subPart;
      console.log(`🔍 SubGroup Strategy 1 (Hierarchisch): "${subGroup}" für ${userEmail}`);
    } else {
      console.log(`🧹 REDUNDANT ignoriert: "${userDept}" für ${userEmail} → keine SubGroup gesetzt`);
    }
  }
}
      
      // Strategy 2: JobTitle als SubGroup (wenn es spezifisch ist) - EXAKT
      if (!subGroup && jobTitle && jobTitle.length > 3 && jobTitle !== departmentName) {
        // Prüfe ob JobTitle SubGroup-Charakteristika hat
        const subGroupIndicators = ['aufbau', 'lager', 'montage', 'service', 'technik', 'verwaltung', 'leitung'];
        const hasSubGroupPattern = subGroupIndicators.some(indicator => 
          jobTitle.toLowerCase().includes(indicator)
        );
        
        if (hasSubGroupPattern) {
          subGroup = jobTitle;
          console.log(`🔍 SubGroup Strategy 2 (JobTitle): "${subGroup}" für ${userEmail}`);
        }
      }
      
      // Strategy 3: Division als SubGroup - EXAKT  
      if (!subGroup && division && division.length > 3 && division !== departmentName) {
        subGroup = division;
        console.log(`🔍 SubGroup Strategy 3 (Division): "${subGroup}" für ${userEmail}`);
      }
      
      // Strategy 4: OfficeLocation als SubGroup - EXAKT
      if (!subGroup && officeLocation && officeLocation.length > 3 && officeLocation !== departmentName) {
        subGroup = officeLocation;
        console.log(`🔍 SubGroup Strategy 4 (OfficeLocation): "${subGroup}" für ${userEmail}`);
      }
      
      // Strategy 5: Pattern-basierte Erkennung aus Department-Namen
      if (!subGroup && userDept) {
        // Suche nach Patterns wie "Produktion - Mechanischer Aufbau"
        const patterns = [
          /[\-–—]\s*(.+)$/,  // Nach Bindestrich
          /\(([^)]+)\)$/,     // In Klammern
          /,\s*(.+)$/,        // Nach Komma
          /_([^_]+)$/         // Nach Unterstrich
        ];
        
        for (const pattern of patterns) {
          const match = userDept.match(pattern);
          if (match && match[1] && match[1].trim().length > 2) {
            subGroup = match[1].trim();
            console.log(`🔍 SubGroup Strategy 5 (Pattern): "${subGroup}" für ${userEmail} aus "${userDept}"`);
            break;
          }
        }
      }
      
      const result = {
        userId: user.id,
        userName: user.displayName || userEmail,
        email: userEmail,
        department: userDept, // Original Department beibehalten
        subGroup: subGroup
      };
      
      // 🔍 ULTRA-DEBUG: Zeige ALLE erkannten Daten pro User
      console.log(`👤 USER: ${result.userName} (${result.email})`);
      console.log(`   📍 Department: "${result.department}"`);
      console.log(`   📍 JobTitle: "${jobTitle}"`);
      console.log(`   📍 Division: "${division}"`);
      console.log(`   📍 OfficeLocation: "${officeLocation}"`);
      console.log(`   📂 SubGroup: ${result.subGroup ? `"${result.subGroup}"` : 'NONE'}`);
      console.log(`   ---`);
      
      return result;
    });
    
    // FINALE SubGroup-Statistik
    const subGroupStats: {[key: string]: number} = {};
    discoveredUsers.forEach(user => {
      if (user.subGroup) {
        subGroupStats[user.subGroup] = (subGroupStats[user.subGroup] || 0) + 1;
      } else {
        subGroupStats['DIREKT_IN_ABTEILUNG'] = (subGroupStats['DIREKT_IN_ABTEILUNG'] || 0) + 1;
      }
    });
    
    console.log(`📊 ERKANNTE SUBGROUPS für ${departmentName}:`);
    Object.entries(subGroupStats).forEach(([sg, count]) => {
      console.log(`   📂 "${sg}": ${count} User`);
    });
    
    return discoveredUsers;
    
  } catch (error) {
    console.error(`❌ Fehler bei ULTRA-REPARIERTER User-Discovery für ${departmentName}:`, error);
    return []; // Fallback: leere Liste
  }
}

/**
 * 🆕 VOLLSTÄNDIGE EISBÄR-POPULATION: Holt ALLE echten Abteilungen und erstellt explizite JSON-Struktur
 */
export async function populateJSONWithAllUsers(): Promise<void> {
  try {
    console.log(`🏗️ Starte VOLLSTÄNDIGE EISBÄR-POPULATION...`);
    
    // 🎯 HOLE ALLE ECHTEN EISBÄR-DATEN direkt aus dem System
    const { AdminPortalOrchestrator } = await import('../../orchestrator');
    const { analyzeUserHierarchy } = await import('./hierarchyAnalyzer');
    
    // 🔧 ALTERNATIVE: Lade User direkt über DataSources (da Orchestrator möglicherweise nicht initialisiert)
    let allSystemUsers: any[] = [];
    
    try {
      const { getUsers } = await import('../../../../datasources');
      allSystemUsers = await getUsers();
    } catch (error) {
      console.error(`❌ Fallback zu DataSources fehlgeschlagen:`, error);
      console.log(`⚠️ Versuche UserAggregator als letzten Ausweg...`);
      
      const allUsersResult = await AdminPortalOrchestrator.userAggregator.getUnifiedUsers({
        page: 1,
        limit: 10000
      });
      
      if (!allUsersResult.success || !allUsersResult.data) {
        console.log(`❌ Kann keine User für EISBÄR-POPULATION laden`);
        return;
      }
      
      allSystemUsers = allUsersResult.data.data;
    }
    console.log(`📋 EISBÄR-POPULATION: ${allSystemUsers.length} User geladen`);
    
    // 🔍 ANALYSIERE ECHTE HIERARCHIE
    const hierarchyResult = await analyzeUserHierarchy(allSystemUsers);
    
    if (!hierarchyResult.success || !hierarchyResult.data) {
      console.log(`❌ Kann keine Hierarchie für EISBÄR-POPULATION analysieren`);
      return;
    }
    
    const realHierarchy = hierarchyResult.data;
    console.log(`📊 ECHTE EISBÄR-STRUKTUR: ${realHierarchy.departments.length} Abteilungen, ${realHierarchy.subGroups.length} Untergruppen`);
    
    // 🏗️ ERSTELLE VOLLSTÄNDIGE EXPLIZITE JSON-STRUKTUR
    const completePermissions: DepartmentPermissions[] = [];
    
    for (const realDept of realHierarchy.departments) {
      console.log(`\n🏢 EISBÄR-ABTEILUNG: ${realDept.name} (${realDept.userCount} User)`);
      
      // 📝 ERSTELLE VOLLSTÄNDIGE DEPARTMENT-PERMISSIONS
      const departmentPermissions: DepartmentPermissions = {
        departmentId: realDept.id,
        departmentName: realDept.name,
        moduleAccess: {
          // 🎯 Standard-Berechtigung für alle EISBÄR-Abteilungen
          hr: 'access',
          support: 'access',
          ai: 'none',
          'admin-portal': 'none'
        },
        subGroups: {},
        userOverrides: {},
        isMainDepartment: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'SYSTEM (EISBÄR-POPULATION)'
      };
      
      // 📂 ERSTELLE ALLE SUBGROUPS mit EXPLIZITEN BERECHTIGUNGEN
      realDept.subGroups.forEach(realSubGroup => {
        console.log(`   📁 SubGroup: ${realSubGroup.displayName} (${realSubGroup.userCount} User)`);
        
        const subGroupPermission: SubGroupPermissions = {
          subGroupId: realSubGroup.id,
          subGroupName: realSubGroup.displayName,
          parentDepartment: realDept.name,
          moduleAccess: {
            // 🎯 SubGroup erbt explizit von Department
            hr: 'access',
            support: 'access',
            ai: 'none',
            'admin-portal': 'none'
          },
          userOverrides: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'SYSTEM (EISBÄR-POPULATION)'
        };
        
        // 👥 ERSTELLE EXPLIZITE USER-OVERRIDES in SubGroup
        realSubGroup.users.forEach(realUser => {
          console.log(`     👤 SubGroup-User: ${realUser.name} (${realUser.email})`);
          subGroupPermission.userOverrides[realUser.id] = {
            // 🎯 User erbt explizit von SubGroup
            hr: 'access',
            support: 'access',
            ai: 'none',
            'admin-portal': 'none'
          };
        });
        
        // 💾 Speichere SubGroup als NESTED
        departmentPermissions.subGroups![realSubGroup.id] = subGroupPermission;
      });
      
      // 👥 ERSTELLE EXPLIZITE USER-OVERRIDES für direkte Abteilungs-User
      realDept.directUsers.forEach(realUser => {
        console.log(`   👤 Direct-User: ${realUser.name} (${realUser.email})`);
        departmentPermissions.userOverrides[realUser.id] = {
          // 🎯 User erbt explizit von Department
          hr: 'access',
          support: 'access',
          ai: 'none',
          'admin-portal': 'none'
        };
      });
      
      console.log(`   ✅ ${realDept.name}: ${realDept.subGroups.length} SubGroups, ${realDept.directUsers.length} direkte User, ${realDept.subGroups.reduce((sum, sg) => sum + sg.userCount, 0)} SubGroup-User`);
      
      completePermissions.push(departmentPermissions);
    }
    
    // 💾 SPEICHERE VOLLSTÄNDIGE EISBÄR-STRUKTUR
    saveAllPermissions(completePermissions);
    
    console.log(`\n🎉 VOLLSTÄNDIGE EISBÄR-POPULATION abgeschlossen!`);
    console.log(`📊 Erstellt: ${completePermissions.length} Abteilungen mit ALLEN Untergruppen und Usern`);
    console.log(`🔥 JSON enthält jetzt EXPLIZITE Berechtigungen für ALLE EISBÄR-Mitarbeiter!`);
    
    // 📋 ZUSAMMENFASSUNG
    const totalSubGroups = completePermissions.reduce((sum, dept) => sum + Object.keys(dept.subGroups || {}).length, 0);
    const totalUsers = completePermissions.reduce((sum, dept) => {
      const directUsers = Object.keys(dept.userOverrides || {}).length;
      const subGroupUsers = Object.values(dept.subGroups || {}).reduce((sgSum, sg) => sgSum + Object.keys(sg.userOverrides || {}).length, 0);
      return sum + directUsers + subGroupUsers;
    }, 0);
    
    console.log(`📈 FINALE STATISTIK:`);
    console.log(`   🏢 ${completePermissions.length} Hauptabteilungen`);
    console.log(`   📁 ${totalSubGroups} Untergruppen`);
    console.log(`   👥 ${totalUsers} User mit expliziten Berechtigungen`);
    
  } catch (error) {
    console.error(`❌ Fehler bei VOLLSTÄNDIGER EISBÄR-POPULATION:`, error);
  }
}

/**
 * Berechnet alle Berechtigungen für einen User (für Frontend)
 */
export async function calculateUserPermissions(userEmail: string, userDepartment: string, userRole?: string) {
  const availableModules = ['hr', 'support', 'ai', 'admin-portal']; // Wird später dynamisch
  const results = [];
  
  // ✅ ALLE User (inkl. Admin) - nutze explizite Admin-Portal Department-Permissions
  const isAdmin = isUserAdmin(userEmail, userRole);
  console.log(`🔍 Berechne Permissions für ${userEmail}${isAdmin ? ' (ADMIN)' : ''} - nutze Department-Konfiguration`);
  
  for (const moduleKey of availableModules) {
    const accessResult = await checkUserModuleAccess(userEmail, userDepartment, moduleKey, userRole);
    
    if (accessResult.success && accessResult.data) {
      console.log(`📋 Module ${moduleKey}: hasAccess=${accessResult.data.hasAccess}, level=${accessResult.data.accessLevel}`);
      results.push({
        moduleKey,
        hasAccess: accessResult.data.hasAccess,
        accessLevel: accessResult.data.accessLevel,
        source: accessResult.data.source,
        reason: accessResult.data.reason
      });
    }
  }
  
  return {
    success: true,
    data: {
      userEmail,
      userDepartment: isAdmin ? userDepartment + ' (Administrator)' : userDepartment,
      permissions: results,
      calculatedAt: new Date().toISOString(),
      isAdmin: isAdmin
    },
    message: `Permissions berechnet für ${userEmail} - ${results.filter(r => r.hasAccess).length}/${results.length} Module verfügbar`
  };
}