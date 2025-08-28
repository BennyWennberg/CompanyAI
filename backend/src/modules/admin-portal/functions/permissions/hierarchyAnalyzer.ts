import { APIResponse } from '../../types';

export interface DetectedHierarchy {
  departments: DepartmentInfo[];
  subGroups: SubGroupInfo[];
  analysisInfo: AnalysisInfo;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  userCount: number;
  subGroups: SubGroupInfo[];
  directUsers: UserInfo[];
  detectedFrom: 'department_parsing';
  hasPermissions: boolean;
}

export interface SubGroupInfo {
  id: string;
  name: string;
  displayName: string;
  parentDepartment: string;
  userCount: number;
  users: UserInfo[];
  hasPermissions: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  source: 'entra' | 'manual' | 'ldap' | 'upload';
  hasIndividualOverrides: boolean;
}

export interface AnalysisInfo {
  totalUsers: number;
  rawDepartmentValues: string[];
  detectedAt: Date;
  parsingStats: {
    withPipe: number;
    withoutPipe: number;
    empty: number;
  };
}

/**
 * Analysiert vorhandene User-Daten und erkennt Abteilungs-Hierarchie
 * Parst Formate wie "Entfeuchtung | Leckortung" automatisch
 */
export async function analyzeUserHierarchy(users: any[]): Promise<APIResponse<DetectedHierarchy>> {
  try {
    console.log(`🔍 Analysiere ${users.length} User für Hierarchie-Erkennung...`);
    
    // Sammle alle einzigartigen Department-Werte
    const departmentValues = users
      .map(user => user.sourceData?.department || user.department || '')
      .filter(dept => dept.trim().length > 0)
      .filter((dept, index, array) => array.indexOf(dept) === index);
    
    console.log('📋 Gefundene Department-Werte:', departmentValues);
    
    // Baue Hierarchie auf
    const hierarchy = buildHierarchyFromDepartments(departmentValues, users);
    
    // Prüfe bestehende Permissions
    await enrichWithExistingPermissions(hierarchy);
    
    return {
      success: true,
      data: hierarchy,
      message: `${hierarchy.departments.length} Abteilungen und ${hierarchy.subGroups.length} Untergruppen erkannt`
    };
    
  } catch (error) {
    console.error('❌ Fehler bei Hierarchie-Analyse:', error);
    return {
      success: false,
      error: 'HierarchyAnalysisError',
      message: 'Hierarchie-Analyse fehlgeschlagen'
    };
  }
}

/**
 * Baut Hierarchie-Struktur aus Department-Werten auf
 */
function buildHierarchyFromDepartments(departmentValues: string[], users: any[]): DetectedHierarchy {
  const departments = new Map<string, DepartmentInfo>();
  const subGroups = new Map<string, SubGroupInfo>();
  let parsingStats = { withPipe: 0, withoutPipe: 0, empty: 0 };
  
  // Analysiere jeden Department-Wert
  departmentValues.forEach(deptValue => {
    const parsed = parseDepartmentValue(deptValue);
    const usersInThisDept = users.filter(u => 
      (u.sourceData?.department || u.department || '') === deptValue
    );
    
    // Statistiken
    if (deptValue.includes(' | ')) parsingStats.withPipe++;
    else parsingStats.withoutPipe++;
    
    // Hauptabteilung registrieren/erweitern
    if (!departments.has(parsed.mainDepartment)) {
      departments.set(parsed.mainDepartment, {
        id: generateDepartmentId(parsed.mainDepartment),
        name: parsed.mainDepartment,
        userCount: 0,
        subGroups: [],
        directUsers: [],
        detectedFrom: 'department_parsing',
        hasPermissions: false
      });
    }
    
    const mainDept = departments.get(parsed.mainDepartment)!;
    mainDept.userCount += usersInThisDept.length;
    
    if (parsed.subDepartment) {
      // Untergruppe erstellen
      const subGroupInfo: SubGroupInfo = {
        id: generateSubGroupId(parsed.mainDepartment, parsed.subDepartment),
        name: deptValue, // "Entfeuchtung | Leckortung"
        displayName: parsed.subDepartment, // "Leckortung"  
        parentDepartment: parsed.mainDepartment, // "Entfeuchtung"
        userCount: usersInThisDept.length,
        users: usersInThisDept.map(mapUserToUserInfo),
        hasPermissions: false
      };
      
      subGroups.set(deptValue, subGroupInfo);
      mainDept.subGroups.push(subGroupInfo);
    } else {
      // User direkt in Hauptabteilung
      mainDept.directUsers.push(...usersInThisDept.map(mapUserToUserInfo));
    }
  });
  
  return {
    departments: Array.from(departments.values()),
    subGroups: Array.from(subGroups.values()),
    analysisInfo: {
      totalUsers: users.length,
      rawDepartmentValues: departmentValues,
      detectedAt: new Date(),
      parsingStats
    }
  };
}

/**
 * Parst Department-Werte in Haupt- und Sub-Department
 */
function parseDepartmentValue(deptValue: string): {
  mainDepartment: string,
  subDepartment: string | null
} {
  if (!deptValue || deptValue.trim().length === 0) {
    return { mainDepartment: 'Unbekannt', subDepartment: null };
  }
  
  // Format: "Entfeuchtung | Leckortung"
  if (deptValue.includes(' | ')) {
    const parts = deptValue.split(' | ');
    const mainDept = parts[0].trim();
    const subDept = parts[1].trim();
    
    // 🔧 REDUNDANTE Einträge erkennen: "Entfeuchtung | Entfeuchtung" → nur "Entfeuchtung"
    if (mainDept.toLowerCase() === subDept.toLowerCase()) {
      console.log(`🧹 REDUNDANT erkannt: "${deptValue}" → behandle als Hauptabteilung "${mainDept}"`);
      return {
        mainDepartment: mainDept,
        subDepartment: null      // ← NULL statt redundant!
      };
    }
    
    return {
      mainDepartment: mainDept,
      subDepartment: subDept
    };
  }
  
  // Nur Hauptabteilung
  return {
    mainDepartment: deptValue.trim(),
    subDepartment: null
  };
}

/**
 * Helper: User zu UserInfo mappen
 */
function mapUserToUserInfo(user: any): UserInfo {
  return {
    id: user.id,
    name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    email: user.email || user.mail || user.userPrincipalName || '',
    jobTitle: user.jobTitle || user.sourceData?.jobTitle || '',
    source: user.source || 'manual',
    hasIndividualOverrides: false // TODO: Später implementieren
  };
}

/**
 * Helper: Department-ID generieren
 */
function generateDepartmentId(deptName: string): string {
  return `dept_${deptName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

/**
 * Helper: SubGroup-ID generieren  
 * ✅ EINHEITLICH mit departmentPermissions.ts - verwendet dept_ Prefix
 */
function generateSubGroupId(mainDept: string, subDept: string): string {
  const cleanDeptName = mainDept.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanSubGroupName = subDept.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `dept_${cleanDeptName}_${cleanSubGroupName}`;
}

/**
 * Erweitert Hierarchie um bestehende Permission-Informationen
 * TODO: Implementieren wenn Permission-Storage verfügbar
 */
async function enrichWithExistingPermissions(hierarchy: DetectedHierarchy): Promise<void> {
  // Placeholder - wird später mit echter Permission-DB-Abfrage gefüllt
  console.log('ℹ️ Permission-Enrichment noch nicht implementiert');
  
  // Beispiel-Logik für später:
  // for (const dept of hierarchy.departments) {
  //   const existingPerms = await getDepartmentPermissions(dept.id);
  //   dept.hasPermissions = !!existingPerms;
  // }
}

/**
 * Lädt Hierarchie-Struktur (für weitere API-Calls)
 */
export async function getHierarchyStructure(): Promise<APIResponse<DetectedHierarchy>> {
  try {
    // TODO: Implementieren - zunächst dynamisch aus Usern laden
    console.log('⚠️ getHierarchyStructure noch nicht vollständig implementiert');
    
    return {
      success: false,
      error: 'NotImplemented',
      message: 'Hierarchy-Structure-Loading noch nicht implementiert'
    };
  } catch (error) {
    return {
      success: false,
      error: 'HierarchyLoadError',
      message: 'Fehler beim Laden der Hierarchie-Struktur'
    };
  }
}
