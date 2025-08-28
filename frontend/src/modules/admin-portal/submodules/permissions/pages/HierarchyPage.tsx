import React, { useState, useEffect } from 'react';
import '../styles/PermissionsPages.css';

// Interfaces basierend auf Backend-Types
interface DepartmentInfo {
  id: string;
  name: string;
  userCount: number;
  subGroups: SubGroupInfo[];
  directUsers: UserInfo[];
  detectedFrom: 'department_parsing';
  hasPermissions: boolean;
}

interface SubGroupInfo {
  id: string;
  name: string;
  displayName: string;
  parentDepartment: string;
  userCount: number;
  users: UserInfo[];
  hasPermissions: boolean;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  source: 'entra' | 'manual' | 'ldap' | 'upload';
  hasIndividualOverrides: boolean;
}

interface DetectedHierarchy {
  departments: DepartmentInfo[];
  subGroups: SubGroupInfo[];
  analysisInfo: {
    totalUsers: number;
    rawDepartmentValues: string[];
    detectedAt: Date;
    parsingStats: {
      withPipe: number;
      withoutPipe: number;
      empty: number;
    };
  };
}

interface ModuleDefinition {
  key: string;
  name: string;
  icon: string;
  pages: PageDefinition[];
}

interface PageDefinition {
  key: string;
  name: string;
  icon: string;
  actions: ActionDefinition[];
}

interface ActionDefinition {
  key: string;
  name: string;
  description: string;
}

type ModuleAccessLevel = 'none' | 'access' | 'admin';

const HierarchyPage: React.FC = () => {
  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<DetectedHierarchy | null>(null);
  const [availableModules, setAvailableModules] = useState<ModuleDefinition[]>([]);
  
  // Selection States
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  // UI States
  const [activeTab, setActiveTab] = useState<'structure' | 'permissions' | 'users'>('structure');
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  
  // Permission States
  const [departmentPermissions, setDepartmentPermissions] = useState<{[departmentId: string]: {[moduleKey: string]: ModuleAccessLevel}}>({});
  const [subGroupPermissions, setSubGroupPermissions] = useState<{[subGroupId: string]: {[moduleKey: string]: ModuleAccessLevel}}>({});
  const [userPermissions, setUserPermissions] = useState<{[userId: string]: {[moduleKey: string]: ModuleAccessLevel}}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Permission Management Functions
  const handleModuleAccessChange = (departmentId: string, moduleKey: string, accessLevel: ModuleAccessLevel) => {
    setDepartmentPermissions(prev => ({
      ...prev,
      [departmentId]: {
        ...prev[departmentId],
        [moduleKey]: accessLevel
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSubGroupPermissionChange = (subGroupId: string, moduleKey: string, accessLevel: ModuleAccessLevel) => {
    setSubGroupPermissions(prev => ({
      ...prev,
      [subGroupId]: {
        ...prev[subGroupId],
        [moduleKey]: accessLevel
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleUserPermissionChange = (userId: string, moduleKey: string, accessLevel: ModuleAccessLevel) => {
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [moduleKey]: accessLevel
      }
    }));
    setHasUnsavedChanges(true);
  };

  // ✨ NEUE Hierarchische Save-Funktion mit Cascade-Warnungen
  const handleSavePermissions = async () => {
    if (!selectedDepartment) {
      alert('Bitte wählen Sie zunächst eine Abteilung aus.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      
      // 🎯 Bestimme Cascade-Modus basierend auf aktueller Auswahl
      let cascadeMode: 'department' | 'subgroup' | 'user';
      let confirmationRequired = false;
      let confirmationMessage = '';
      
      if (selectedUser) {
        // 👤 User-Level: Nur individual overrides
        cascadeMode = 'user';
        confirmationMessage = `
          ✨ User-spezifische Berechtigung
          
          Wird nur für den Benutzer "${getAvailableUsers().find(u => u.id === selectedUser)?.name}" geändert.
          Abteilungs- und Gruppenberechtigungen bleiben unverändert.
        `;
      } else if (selectedSubGroup) {
        // 📂 SubGroup-Level: Nur diese Untergruppe betroffen
        cascadeMode = 'subgroup';
        const subGroupData = getSelectedSubGroupData();
        const affectedUsers = subGroupData?.userCount || 0;
        confirmationMessage = `
          📂 Untergruppen-Berechtigung
          
          Betrifft nur die Untergruppe "${subGroupData?.displayName}":
          • ${affectedUsers} Benutzer erhalten diese Berechtigung
          • Individuelle User-Overrides in dieser Gruppe werden gelöscht
          • Andere Untergruppen bleiben unverändert
          
          Fortfahren?
        `;
        confirmationRequired = true;
      } else {
        // 🏢 Department-Level: VOLLSTÄNDIGER CASCADE zu allen Untergruppen
        cascadeMode = 'department';
        const departmentData = getSelectedDepartmentData();
        const totalUsers = departmentData?.userCount || 0;
        const subGroupCount = departmentData?.subGroups.length || 0;
        
        confirmationMessage = `
          ⚠️ ACHTUNG: Oberabteilungs-Berechtigung!
          
          Diese Änderung wird ALLE Unterstrukturen überschreiben:
          
          🏢 Abteilung: ${departmentData?.name}
          📊 Betroffene Bereiche:
          • ${subGroupCount} Untergruppen werden überschrieben
          • ${totalUsers} Benutzer insgesamt betroffen
          • Alle individuellen User-Overrides werden gelöscht
          
          ⚠️ WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden!
          
          Wirklich fortfahren?
        `;
        confirmationRequired = true;
      }

      // 🚨 Benutzerbestätigung für kritische Operationen
      if (confirmationRequired) {
        const userConfirmed = confirm(confirmationMessage);
        if (!userConfirmed) {
          console.log('🚫 User hat Speichern abgebrochen');
          setSaving(false);
          return;
        }
      } else {
        // Für User-Level: Einfache Info-Meldung
        if (!confirm(confirmationMessage + '\n\nSpeichern?')) {
          setSaving(false);
          return;
        }
      }

      // 🎯 Bestimme die zu sendenden Permissions basierend auf Auswahl
      let permissionData: any;

      if (selectedUser) {
        // 👤 USER-MODUS: NUR User-Overrides senden, Department-Permissions NICHT überschreiben
        const jsonDepartmentId = getJsonDepartmentId(selectedDepartment);
        permissionData = {
          departmentId: jsonDepartmentId,
          departmentName: getSelectedDepartmentData()?.name || selectedDepartment,
          // ✅ KEINE moduleAccess - Department bleibt unverändert
          subGroupId: selectedSubGroup || undefined,
          subGroupName: selectedSubGroup ? getSelectedSubGroupData()?.displayName : undefined,
          // ✅ KEINE subGroupPermissions - SubGroup bleibt unverändert
          userOverrides: userPermissions,
          cascadeMode: cascadeMode,
          updatedAt: new Date().toISOString()
        };
        console.log('👤 Sende NUR USER-Permissions - Department/SubGroup bleiben unverändert');
      } else if (selectedSubGroup) {
        // 📂 UNTERGRUPPEN-MODUS: SubGroup-Permissions senden, Department-Permissions NICHT überschreiben
        const jsonDepartmentId = getJsonDepartmentId(selectedDepartment);
        permissionData = {
          departmentId: jsonDepartmentId, // ← IMMER die Hauptabteilung (JSON-ID verwenden!)
          departmentName: getSelectedDepartmentData()?.name || selectedDepartment,
          // ✅ KEINE moduleAccess - Department bleibt unverändert
          subGroupId: selectedSubGroup, // ← SubGroup-ID extra Parameter
          subGroupName: getSelectedSubGroupData()?.displayName,
          subGroupPermissions: subGroupPermissions[selectedSubGroup] || {}, // ← SubGroup-Permissions extra
          userOverrides: userPermissions,
          cascadeMode: cascadeMode,
          updatedAt: new Date().toISOString()
        };
        console.log('📂 Sende NUR UNTERGRUPPEN-Permissions - Department bleibt unverändert');
      } else {
        // 🏢 HAUPTABTEILUNGS-MODUS: Sende Department-Permissions
        const jsonDepartmentId = getJsonDepartmentId(selectedDepartment);
        permissionData = {
          departmentId: jsonDepartmentId,
          departmentName: getSelectedDepartmentData()?.name || selectedDepartment,
          moduleAccess: departmentPermissions[jsonDepartmentId] || {},
          userOverrides: userPermissions,
          cascadeMode: cascadeMode,
          updatedAt: new Date().toISOString()
        };
        console.log('🏢 Sende HAUPTABTEILUNGS-Permissions');
      }

      console.log(`🔄 Speichere Berechtigungen (${cascadeMode}-Modus):`, permissionData);

      // ✨ Verwende die NEUE hierarchische Cascade-API (mit JSON-ID)
      const jsonDepartmentId = getJsonDepartmentId(selectedDepartment);
      const response = await fetch(`http://localhost:5000/api/admin-portal/hierarchy/departments/${jsonDepartmentId}/permissions/cascade`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permissionData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Berechtigungen erfolgreich gespeichert:', result.data);
        
        // 📊 Zeige Ergebnis - berücksichtige unterschiedliche Antwortstrukturen
        let resultMessage = 'Berechtigungen erfolgreich gespeichert!\n\n';
        
        if (result.data.cascadeInfo) {
          // 🔄 HIERARCHISCHE CASCADE-Antwort (saveDepartmentPermissionsWithCascade)
          const cascadeInfo = result.data.cascadeInfo;
          
          if (cascadeInfo.mode === 'department') {
            resultMessage += `🏢 Department-Cascade abgeschlossen:
            • ${result.data.affectedDepartments?.length || 0} Abteilungen aktualisiert
            • ${result.data.affectedUsers?.length || 0} Benutzer-Overrides gelöscht
            • ${cascadeInfo.clearedSubGroups || 0} Untergruppen überschrieben`;
          } else if (cascadeInfo.mode === 'subgroup') {
            resultMessage += `📂 SubGroup-Update abgeschlossen:
            • 1 Untergruppe aktualisiert
            • ${result.data.affectedUsers?.length || 0} User-Overrides betroffen`;
          } else {
            resultMessage += `👤 User-Override gesetzt für ${result.data.affectedUsers?.length || 0} Benutzer`;
          }
        } else {
          // 📂 EINFACHE SubGroup-Antwort (saveSubGroupPermissions)
          if (selectedSubGroup) {
            resultMessage += `📂 Untergruppen-Berechtigung aktualisiert:
            • Untergruppe: ${getSelectedSubGroupData()?.displayName}
            • Module: ${Object.keys(subGroupPermissions[selectedSubGroup] || {}).length} konfiguriert`;
          } else if (selectedUser) {
            resultMessage += `👤 User-Override aktualisiert:
            • User: ${getAvailableUsers().find(u => u.id === selectedUser)?.name}
            • Module: ${Object.keys(userPermissions[selectedUser] || {}).length} konfiguriert`;
          } else {
            resultMessage += `🏢 Abteilungs-Berechtigung aktualisiert:
            • Abteilung: ${getSelectedDepartmentData()?.name}
            • Module: ${Object.keys(departmentPermissions[selectedDepartment] || {}).length} konfiguriert`;
          }
        }
        
        setHasUnsavedChanges(false);
        alert(resultMessage);
        
        // 🔄 Lade Daten neu, um alle Änderungen zu reflektieren
        await loadData();
      } else {
        console.error('❌ Fehler beim Speichern:', result.message);
        alert(`Fehler beim Speichern: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Netzwerk-Fehler beim Speichern:', error);
      alert('Verbindungsfehler beim Speichern der Berechtigungen');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPermissions = () => {
    if (selectedDepartment) {
      const jsonDepartmentId = getJsonDepartmentId(selectedDepartment);
      setDepartmentPermissions(prev => ({
        ...prev,
        [jsonDepartmentId]: {}
      }));
    }
    if (selectedSubGroup) {
      setSubGroupPermissions(prev => ({
        ...prev,
        [selectedSubGroup]: {}
      }));
    }
    setUserPermissions({});
    setHasUnsavedChanges(false);
  };

  // ✨ NEUE Auto-Initialize-Funktion
  const handleAutoInitialize = async () => {
    const confirmed = confirm(`
      🔄 Automatische Berechtigungsvererbung initialisieren
      
      Dies erstellt automatisch Berechtigungen für alle erkannten Abteilungen und Untergruppen 
      basierend auf den synchronisierten User-Daten aus Entra ID/LDAP.
      
      Standard-Berechtigungen:
      • Hauptabteilungen: HR=read, Support=none, AI=none, Admin-Portal=none
      • Untergruppen: Erben von Hauptabteilung + Support=read
      
      Fortfahren?
    `);
    
    if (!confirmed) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      
      console.log('🔄 Starte automatische Berechtigungsinitialisierung...');
      
      const response = await fetch('http://localhost:5000/api/admin-portal/permissions/auto-initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Automatische Vererbung erfolgreich initialisiert!

📊 Statistik:
• ${result.data.initializedDepartments} Hauptabteilungen erstellt
• ${result.data.initializedSubGroups} Untergruppen erstellt  
• ${result.data.totalPermissionEntries} Berechtigungseinträge insgesamt

Die Berechtigungen wurden automatisch basierend auf Ihrer echten Abteilungsstruktur erstellt.`);
        
        // Daten neu laden
        await loadData();
      } else {
        alert(`❌ Fehler bei Auto-Initialisierung: ${result.message}`);
      }
      
    } catch (error) {
      console.error('❌ Auto-Initialize-Fehler:', error);
      alert(`❌ Fehler: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Parallel laden der Daten (+ gespeicherte Permissions!)
      const [hierarchyResponse, modulesResponse, permissionsResponse] = await Promise.all([
        fetch('http://localhost:5000/api/admin-portal/hierarchy/analyze', { headers }),
        fetch('http://localhost:5000/api/admin-portal/hierarchy/modules', { headers }),
        fetch('http://localhost:5000/api/admin-portal/hierarchy/permissions/all', { headers })
      ]);

      if (!hierarchyResponse.ok || !modulesResponse.ok || !permissionsResponse.ok) {
        throw new Error('API-Fehler beim Laden der Daten');
      }

      const [hierarchyResult, modulesResult, permissionsResult] = await Promise.all([
        hierarchyResponse.json(),
        modulesResponse.json(),
        permissionsResponse.json()
      ]);

      // 1. Hierarchie-Struktur laden
      if (hierarchyResult.success) {
        setHierarchy(hierarchyResult.data);
        // Auto-select erste Abteilung
        if (hierarchyResult.data.departments.length > 0) {
          setSelectedDepartment(hierarchyResult.data.departments[0].id);
        }
      } else {
        setError(hierarchyResult.message || 'Hierarchie-Analyse fehlgeschlagen');
      }

      // 2. Verfügbare Module laden
      if (modulesResult.success) {
        setAvailableModules(modulesResult.data);
      }

      // 3. 🔧 GESPEICHERTE PERMISSIONS LADEN (KORRIGIERT!)
      if (permissionsResult.success && permissionsResult.data) {
        console.log('📋 Lade gespeicherte Department-Permissions:', permissionsResult.data);
        
        const departmentPerms: {[departmentId: string]: {[moduleKey: string]: ModuleAccessLevel}} = {};
        const subGroupPerms: {[subGroupId: string]: {[moduleKey: string]: ModuleAccessLevel}} = {};
        const userPerms: {[userId: string]: {[moduleKey: string]: ModuleAccessLevel}} = {};

        // Department-Permissions extrahieren
        permissionsResult.data.forEach((permission: any) => {
          // 🏢 HAUPTABTEILUNG: Normale Department-Permissions
          if (permission.isMainDepartment !== false && !permission.departmentName?.includes(' | ')) {
            departmentPerms[permission.departmentId] = permission.moduleAccess || {};
            
            // 📂 UNTERGRUPPEN: Aus subGroups-Feld extrahieren (KORREKT!)
            if (permission.subGroups) {
              Object.keys(permission.subGroups).forEach(subGroupId => {
                const subGroupData = permission.subGroups[subGroupId];
                subGroupPerms[subGroupId] = subGroupData.moduleAccess || {};
                console.log(`📂 SubGroup ${subGroupId} geladen:`, subGroupData.moduleAccess);
                
                // User-Overrides aus SubGroup
                if (subGroupData.userOverrides) {
                  console.log(`🔍 LADE User-Overrides aus SubGroup ${subGroupId}:`, subGroupData.userOverrides);
                  Object.keys(subGroupData.userOverrides).forEach(userId => {
                    console.log(`  👤 User ${userId} bekommt Permissions:`, subGroupData.userOverrides[userId]);
                    userPerms[userId] = { ...userPerms[userId], ...subGroupData.userOverrides[userId] };
                  });
                }
              });
            }
            
            // User-Overrides aus Hauptabteilung
            if (permission.userOverrides) {
              Object.keys(permission.userOverrides).forEach(userId => {
                userPerms[userId] = { ...userPerms[userId], ...permission.userOverrides[userId] };
              });
            }
          }
        });

        setDepartmentPermissions(departmentPerms);
        setSubGroupPermissions(subGroupPerms);
        setUserPermissions(userPerms);
        
        console.log('✅ Department-Permissions geladen:', departmentPerms);
        console.log('✅ SubGroup-Permissions geladen:', subGroupPerms);
        console.log('✅ User-Overrides geladen:', userPerms);
        
        // 🚨 DEBUG: ID-Mismatch Problem analysieren
        console.log('🔍 DEBUG - Alle Department-IDs in JSON:', Object.keys(departmentPerms));
        console.log('🔍 DEBUG - Hierarchy Department-IDs:', hierarchyResult.data?.departments?.map((d: any) => d.id) || []);
        
        // 🎯 ID-MAPPING erstellen: Hierarchie-ID → JSON-ID
        const idMapping: {[hierarchyId: string]: string} = {};
        if (hierarchyResult.data?.departments && permissionsResult.data) {
          hierarchyResult.data.departments.forEach((dept: any) => {
            // Versuche passende JSON-Einträge zu finden basierend auf Department-Namen
            const matchingJsonEntry = permissionsResult.data.find((entry: any) => 
              entry.departmentName?.toLowerCase() === dept.name?.toLowerCase() ||
              entry.departmentName?.toLowerCase().includes(dept.name?.toLowerCase()) ||
              dept.name?.toLowerCase().includes(entry.departmentName?.toLowerCase())
            );
            
            if (matchingJsonEntry) {
              idMapping[dept.id] = matchingJsonEntry.departmentId;
              console.log(`🔗 ID-Mapping: "${dept.id}" → "${matchingJsonEntry.departmentId}" (${dept.name})`);
            } else {
              console.log(`⚠️ KEIN Match für Hierarchie-Department: "${dept.id}" (${dept.name})`);
            }
          });
        }
        
        // 📝 ID-Mapping für später speichern
        (window as any).departmentIdMapping = idMapping;
      } else {
        console.log('📋 Keine gespeicherten Department-Permissions gefunden (oder Fehler beim Laden)');
      }

    } catch (err: any) {
      console.error('Fehler beim Laden der Hierarchy-Daten:', err);
      setError('Verbindungsfehler zum Backend');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDepartmentData = (): DepartmentInfo | undefined => {
    return hierarchy?.departments.find(d => d.id === selectedDepartment);
  };

  const getSelectedSubGroupData = (): SubGroupInfo | undefined => {
    const department = getSelectedDepartmentData();
    return department?.subGroups.find(sg => sg.id === selectedSubGroup);
  };

  const getAvailableUsers = (): UserInfo[] => {
    let users: UserInfo[] = [];
    
    if (selectedSubGroup) {
      const subGroup = getSelectedSubGroupData();
      users = subGroup?.users || [];
    } else if (selectedDepartment) {
      const department = getSelectedDepartmentData();
      users = department?.directUsers || [];
    }
    
    console.log(`🔍 DEBUG - Verfügbare User in aktueller Auswahl:`, users.map(u => ({ id: u.id, name: u.name })));
    return users;
  };

  // 🎯 NEUE Hilfsfunktion: Hierarchie-ID → JSON-ID
  const getJsonDepartmentId = (hierarchyDepartmentId: string): string => {
    const mapping = (window as any).departmentIdMapping || {};
    const jsonId = mapping[hierarchyDepartmentId] || hierarchyDepartmentId;
    console.log(`🔍 getJsonDepartmentId: "${hierarchyDepartmentId}" → "${jsonId}"`);
    return jsonId;
  };

  const renderDropdownSelection = () => {
    return (
      <div className="hierarchy-selector">
        <div className="selector-row">
          {/* Department Dropdown */}
          <div className="selector-field">
            <label>🏢 Abteilung:</label>
            <select 
              value={selectedDepartment} 
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedSubGroup(''); // Reset subgroup
                setSelectedUser(''); // Reset user
              }}
              className="dropdown"
            >
              <option value="">-- Abteilung wählen --</option>
              {hierarchy?.departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.userCount} Mitarbeiter)
                </option>
              ))}
            </select>
          </div>

          {/* SubGroup Dropdown */}
          {selectedDepartment && (
            <div className="selector-field">
              <label>📂 Untergruppe:</label>
              <select 
                value={selectedSubGroup} 
                onChange={(e) => {
                  setSelectedSubGroup(e.target.value);
                  setSelectedUser(''); // Reset user
                }}
                className="dropdown"
              >
                <option value="">-- Obergruppe ({getSelectedDepartmentData()?.name}) --</option>
                {getSelectedDepartmentData()?.subGroups.map(subGroup => (
                  <option key={subGroup.id} value={subGroup.id}>
                    {subGroup.displayName} ({subGroup.userCount} Mitarbeiter)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Dropdown */}
          {selectedDepartment && (
            <div className="selector-field">
              <label>👤 Benutzer:</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                className="dropdown"
              >
                <option value="">-- Alle Benutzer ({getAvailableUsers().length}) --</option>
                {getAvailableUsers().map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.jobTitle || 'Unbekannt'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selection Summary */}
        {selectedDepartment && (
          <div className="selection-summary">
            <div className="selection-path">
              <span className="path-item">🏢 {getSelectedDepartmentData()?.name}</span>
              {selectedSubGroup && (
                <>
                  <span className="path-separator">›</span>
                  <span className="path-item">📂 {getSelectedSubGroupData()?.displayName}</span>
                </>
              )}
              {selectedUser && (
                <>
                  <span className="path-separator">›</span>
                  <span className="path-item">👤 {getAvailableUsers().find(u => u.id === selectedUser)?.name}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPermissionMatrix = () => {
    if (!selectedDepartment) {
      return (
        <div className="empty-state">
          <p>👈 Wähle eine Abteilung aus, um Berechtigungen zu bearbeiten</p>
        </div>
      );
    }

    return (
      <div className="permission-matrix">
        <div className="matrix-header">
          {selectedUser ? (
            <>
              <h3>👤 User-Overrides für: {getAvailableUsers().find(u => u.id === selectedUser)?.name}</h3>
              <p className="matrix-subtitle">
                🏢 {getSelectedDepartmentData()?.name}
                {selectedSubGroup && ` › 📂 ${getSelectedSubGroupData()?.displayName}`}
              </p>
            </>
          ) : selectedSubGroup ? (
            <>
              <h3>📂 Untergruppen-Berechtigung: {getSelectedSubGroupData()?.displayName}</h3>
              <p className="matrix-subtitle">
                🏢 {getSelectedDepartmentData()?.name} › Betrifft {getSelectedSubGroupData()?.userCount} Benutzer
              </p>
            </>
          ) : (
            <>
              <h3>🏢 Abteilungs-Berechtigung: {getSelectedDepartmentData()?.name}</h3>
              <p className="matrix-subtitle">
                Basis-Berechtigung für alle Benutzer der Abteilung
              </p>
            </>
          )}
        </div>

        <div className="modules-grid">
          {availableModules.map(module => (
            <div key={module.key} className="module-card">
              <div className="module-header">
                <h4>{module.icon} {module.name}</h4>
              </div>

              {/* 🏢 OBERE LEISTE (ROT): GANZE ABTEILUNG - IMMER SICHTBAR */}
              <div className="department-level-section">
                <div className="level-header">
                  <h5>🏢 Abteilungs-Berechtigung</h5>
                  <p>Basis für alle {getSelectedDepartmentData()?.userCount || 0} Benutzer in {getSelectedDepartmentData()?.name}</p>
                </div>
                <div className="access-level-selector">
                  <select 
                    className="access-dropdown department-level"
                    value={(() => {
                      const jsonDepartmentId = getJsonDepartmentId(selectedDepartment);
                      const permission = departmentPermissions[jsonDepartmentId]?.[module.key] || 'none';
                      console.log(`🔍 DEBUG - Module ${module.key}: selectedDepartment="${selectedDepartment}" → jsonId="${jsonDepartmentId}", permission="${permission}"`);
                      console.log(`🔍 DEBUG - departmentPermissions[${jsonDepartmentId}]:`, departmentPermissions[jsonDepartmentId]);
                      return permission;
                    })()}
                    onChange={(e) => {
                      const jsonDepartmentId = getJsonDepartmentId(selectedDepartment);
                      handleModuleAccessChange(jsonDepartmentId, module.key, e.target.value as ModuleAccessLevel);
                    }}
                  >
                    <option value="none">🚫 Kein Zugriff</option>
                    <option value="access">✅ Zugriff</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </div>
              </div>

              {/* 📂 MITTLERE LEISTE (ORANGE): JEWEILIGE UNTERGRUPPE - IMMER SICHTBAR WENN UNTERGRUPPE EXISTIERT */}
              {selectedSubGroup && (
                <div className="subgroup-level-section">
                  <div className="level-header">
                    <h5>📂 Untergruppen-Berechtigung</h5>
                    <p>Für {getSelectedSubGroupData()?.userCount || 0} Benutzer in "{getSelectedSubGroupData()?.displayName}"</p>
                  </div>
                  <div className="inheritance-control">
                    <div className="inheritance-info">
                      <span>🏢 Erbt: </span>
                      <strong style={{color: departmentPermissions[getJsonDepartmentId(selectedDepartment)]?.[module.key] ? 'var(--primary-color)' : 'var(--text-muted)'}}>
                        {departmentPermissions[getJsonDepartmentId(selectedDepartment)]?.[module.key] || 'Kein Zugriff'}
                      </strong>
                      <span> → 📂 Override: </span>
                      <select 
                        className="access-dropdown subgroup-override"
                        value={subGroupPermissions[selectedSubGroup]?.[module.key] || 'inherit'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'inherit') {
                            // Vererbung aktivieren - SubGroup-Permission löschen
                            setSubGroupPermissions(prev => {
                              const updated = { ...prev };
                              if (updated[selectedSubGroup]) {
                                delete updated[selectedSubGroup][module.key];
                                if (Object.keys(updated[selectedSubGroup]).length === 0) {
                                  delete updated[selectedSubGroup];
                                }
                              }
                              return updated;
                            });
                          } else {
                            handleSubGroupPermissionChange(selectedSubGroup, module.key, value as ModuleAccessLevel);
                          }
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <option value="inherit">← Von Abteilung erben</option>
                        <option value="none">🚫 Kein Zugriff</option>
                        <option value="access">✅ Zugriff</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                    </div>
                    {subGroupPermissions[selectedSubGroup]?.[module.key] && (
                      <div className="override-indicator">
                        ⚠️ Untergruppen-Override aktiv
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 👤 UNTERE LEISTE (GELB): USER SPEZIFISCH - IMMER SICHTBAR WENN USER AUSGEWÄHLT */}
              {selectedUser && (
                <div className="user-level-section">
                  <div className="level-header">
                    <h5>👤 User-Override</h5>
                    <p>Individuelle Berechtigung für "{getAvailableUsers().find(u => u.id === selectedUser)?.name}"</p>
                  </div>
                  <div className="inheritance-control">
                    <div className="inheritance-info">
                      <span>🏢 Abteilung: </span>
                      <strong style={{color: departmentPermissions[getJsonDepartmentId(selectedDepartment)]?.[module.key] ? 'var(--primary-color)' : 'var(--text-muted)'}}>
                        {departmentPermissions[getJsonDepartmentId(selectedDepartment)]?.[module.key] || 'Kein Zugriff'}
                      </strong>
                      {selectedSubGroup && (
                        <>
                          <span> → 📂 Untergruppe: </span>
                          <strong style={{color: (subGroupPermissions[selectedSubGroup]?.[module.key] || departmentPermissions[getJsonDepartmentId(selectedDepartment)]?.[module.key]) ? 'var(--primary-color)' : 'var(--text-muted)'}}>
                            {subGroupPermissions[selectedSubGroup]?.[module.key] || departmentPermissions[getJsonDepartmentId(selectedDepartment)]?.[module.key] || 'Kein Zugriff'}
                          </strong>
                        </>
                      )}
                      <span> → 👤 User: </span>
                      <select 
                        className="access-dropdown user-override"
                        value={(() => {
                          const userPerm = userPermissions[selectedUser]?.[module.key] || 'inherit';
                          console.log(`🔍 USER-OVERRIDE DEBUG für ${module.key}:`);
                          console.log(`  Selected User: "${selectedUser}"`);
                          console.log(`  User Permission: "${userPerm}"`);
                          console.log(`  Alle User-Permissions:`, userPermissions);
                          console.log(`  User-Permissions für diesen User:`, userPermissions[selectedUser]);
                          return userPerm;
                        })()}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'inherit') {
                            // Vererbung aktivieren - User-Permission löschen
                            setUserPermissions(prev => {
                              const updated = { ...prev };
                              if (updated[selectedUser]) {
                                delete updated[selectedUser][module.key];
                                if (Object.keys(updated[selectedUser]).length === 0) {
                                  delete updated[selectedUser];
                                }
                              }
                              return updated;
                            });
                          } else {
                            handleUserPermissionChange(selectedUser, module.key, value as ModuleAccessLevel);
                          }
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <option value="inherit">← Von Abteilung/Gruppe erben</option>
                        <option value="none">🚫 Kein Zugriff</option>
                        <option value="access">✅ Zugriff</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                    </div>
                    {userPermissions[selectedUser]?.[module.key] && (
                      <div className="override-indicator">
                        ⚠️ User-Override aktiv
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🎯 SEITEN-LEVEL PERMISSIONS: Jede Seite einzeln konfigurierbar, aber OHNE Action-Details */}
              <div className="pages-list">
                {module.pages.map(page => (
                  <div key={page.key} className="page-item">
                    <div className="page-header">
                      <span className="page-name">{page.icon} {page.name}</span>
                      <select className="page-access-dropdown">
                        <option value="inherit">← Vom Modul erben</option>
                        <option value="none">🚫 Kein Zugriff</option>
                        <option value="access">✅ Zugriff</option>
                        <option value="admin">👑 Admin-Vollzugriff</option>
                      </select>
                    </div>
                    {/* ✅ KOMPAKT: Keine zusätzlichen Boxen */}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="matrix-actions">
          <button 
            className={`btn btn-primary ${hasUnsavedChanges ? 'btn-highlight' : ''}`}
            onClick={handleSavePermissions}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? '💫 Speichere...' : '💾 Berechtigungen speichern'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleResetPermissions}
            disabled={saving}
          >
            🔄 Zurücksetzen
          </button>
          <button className="btn btn-outline">
            👀 Vorschau effektive Rechte
          </button>
          {hasUnsavedChanges && (
            <div className="unsaved-warning">
              ⚠️ Sie haben ungespeicherte Änderungen
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStructureTab = () => {
    if (!hierarchy) return null;

    return (
      <div className="structure-overview">
        <div className="analysis-summary">
          <div className="summary-cards">
            <div className="summary-card">
              <h4>🏢 Abteilungen</h4>
              <div className="summary-value">{hierarchy.departments.length}</div>
            </div>
            <div className="summary-card">
              <h4>📂 Untergruppen</h4>
              <div className="summary-value">{hierarchy.subGroups.length}</div>
            </div>
            <div className="summary-card">
              <h4>👥 Benutzer gesamt</h4>
              <div className="summary-value">{hierarchy.analysisInfo.totalUsers}</div>
            </div>
            <div className="summary-card">
              <h4>📊 Mit "|" Format</h4>
              <div className="summary-value">{hierarchy.analysisInfo.parsingStats.withPipe}</div>
            </div>
          </div>

          <button 
            className="btn btn-outline"
            onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
          >
            {showAnalysisDetails ? '👁️ Details verbergen' : '🔍 Analyse-Details anzeigen'}
          </button>
        </div>

        {showAnalysisDetails && (
          <div className="analysis-details">
            <h4>📋 Raw Department Values:</h4>
            <div className="raw-values">
              {hierarchy.analysisInfo.rawDepartmentValues.map((value, index) => (
                <span key={index} className="raw-value-tag">
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="departments-tree">
          {hierarchy.departments.map(department => (
            <div key={department.id} className="department-node">
              <div className="department-header">
                <span className="department-icon">🏢</span>
                <span className="department-name">{department.name}</span>
                <span className="user-count">({department.userCount} Mitarbeiter)</span>
                {department.hasPermissions && (
                  <span className="permissions-badge">🔐 Konfiguriert</span>
                )}
              </div>

              {department.subGroups.length > 0 && (
                <div className="subgroups-list">
                  {department.subGroups.map(subGroup => (
                    <div key={subGroup.id} className="subgroup-node">
                      <span className="subgroup-icon">📂</span>
                      <span className="subgroup-name">{subGroup.displayName}</span>
                      <span className="user-count">({subGroup.userCount})</span>
                    </div>
                  ))}
                </div>
              )}

              {department.directUsers.length > 0 && (
                <div className="direct-users">
                  <span className="direct-users-label">👤 Direkt zugeordnet: {department.directUsers.length}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="hierarchy-page">
        <div className="page-header">
          <div className="page-title">
            <h1>🏗️ Hierarchische Berechtigungen</h1>
            <p>Abteilungs-basierte Rechteverwaltung</p>
          </div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Analysiere User-Hierarchie...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="hierarchy-page">
        <div className="page-header">
          <div className="page-title">
            <h1>🏗️ Hierarchische Berechtigungen</h1>
            <p>Abteilungs-basierte Rechteverwaltung</p>
          </div>
        </div>
        <div className="error-state">
          <h3>❌ Fehler</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadData}>
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hierarchy-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🏗️ Hierarchische Berechtigungen</h1>
          <p>Abteilungs-basierte Rechteverwaltung mit automatischer User-Hierarchie</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadData}>
            🔄 Hierarchie aktualisieren
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleAutoInitialize}
            disabled={saving}
          >
            {saving ? '⏳ Initialisiere...' : '✨ Auto-Vererbung starten'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab ${activeTab === 'structure' ? 'active' : ''}`}
          onClick={() => setActiveTab('structure')}
        >
          🏗️ Struktur-Übersicht
        </button>
        <button 
          className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          🔐 Berechtigungen bearbeiten
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Benutzer-Übersicht
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'structure' && renderStructureTab()}
        
        {activeTab === 'permissions' && (
          <div className="permissions-tab">
            {renderDropdownSelection()}
            {renderPermissionMatrix()}
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="users-tab">
            {renderDropdownSelection()}
            <div className="users-list">
              {getAvailableUsers().length > 0 ? (
                <div className="users-grid">
                  {getAvailableUsers().map(user => (
                    <div key={user.id} className="user-card">
                      <div className="user-info">
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                        <p>{user.jobTitle || 'Unbekannt'}</p>
                      </div>
                      <div className="user-source">
                        <span className={`source-badge source-${user.source}`}>
                          {user.source}
                        </span>
                        {user.hasIndividualOverrides && (
                          <span className="override-badge">🎯 Individual</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>👈 Wähle eine Abteilung oder Untergruppe aus, um Benutzer zu sehen</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchyPage;
