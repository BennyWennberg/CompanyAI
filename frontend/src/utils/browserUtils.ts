/**
 * Browser Utility Functions für CompanyAI
 * Stellt sicher, dass Tabs wiederverwendet werden anstatt neue zu öffnen
 */

/**
 * Öffnet URLs in benannten Tabs zur Wiederverwendung
 */
export const openInCompanyAITab = (url: string, tabType: 'api-docs' | 'external' | 'main' = 'external') => {
  const tabName = `companyai-${tabType}`;
  return window.open(url, tabName);
};

/**
 * Navigiert zur internen Route, wiederverwendet aktuelles Tab
 */
export const navigateToRoute = (route: string) => {
  window.location.href = route;
};

/**
 * Öffnet API Dokumentation in wiederverwendbarem Tab
 */
export const openApiDocs = () => {
  return openInCompanyAITab('http://localhost:5000/api/hello', 'api-docs');
};

/**
 * Öffnet Swagger Dokumentation in wiederverwendbarem Tab
 */
export const openSwaggerDocs = () => {
  return openInCompanyAITab('http://localhost:5000/api/docs', 'api-docs');
};

/**
 * Fokussiert oder öffnet CompanyAI Haupt-Tab
 */
export const focusCompanyAITab = () => {
  const mainWindow = window.open('', 'companyai-main');
  if (mainWindow) {
    mainWindow.focus();
    return mainWindow;
  }
  return null;
};
